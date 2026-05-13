from contextlib import contextmanager
from typing import Any, Dict, Generator
from urllib.parse import quote_plus

import pandas as pd

from app.nodes.base import BaseNodeProcessor


@contextmanager
def _maybe_ssh_tunnel(config: Dict[str, Any]) -> Generator[tuple, None, None]:
    """
    Context manager that optionally opens an SSH tunnel.

    Yields (db_host, db_port) — either the original values (no tunnel)
    or the local tunnel endpoint (127.0.0.1, <local_bind_port>).
    """
    use_ssh   = bool(config.get("use_ssh_tunnel", False))
    db_host   = str(config.get("host", "localhost"))
    db_port   = int(config.get("port", 5432))

    if not use_ssh:
        yield db_host, db_port
        return

    import sshtunnel  # lazy import — optional dep

    ssh_host     = str(config.get("ssh_host", ""))
    ssh_port     = int(config.get("ssh_port", 22))
    ssh_user     = str(config.get("ssh_user", ""))
    ssh_password = config.get("ssh_password", "")
    ssh_key      = config.get("ssh_private_key", "")   # PEM string

    if not ssh_host:
        raise ValueError("DatabaseQueryNode: 'ssh_host' is required when SSH tunnel is enabled")

    # Build keyword args for SSHTunnelForwarder
    tunnel_kwargs: Dict[str, Any] = {
        "ssh_username":       ssh_user,
        "remote_bind_address": (db_host, db_port),
    }
    if ssh_key:
        import io
        import paramiko
        pkey = paramiko.RSAKey.from_private_key(io.StringIO(str(ssh_key)))
        tunnel_kwargs["ssh_pkey"] = pkey
    elif ssh_password:
        tunnel_kwargs["ssh_password"] = str(ssh_password)
    else:
        raise ValueError("DatabaseQueryNode: SSH tunnel requires either 'ssh_password' or 'ssh_private_key'")

    with sshtunnel.SSHTunnelForwarder((ssh_host, ssh_port), **tunnel_kwargs) as tunnel:
        tunnel.start()
        yield "127.0.0.1", tunnel.local_bind_port


class DatabaseQueryProcessor(BaseNodeProcessor):
    """
    Source node — executes a SQL query against a relational database
    and outputs a pandas DataFrame.

    Supported databases: PostgreSQL, MySQL, SQLite

    Config keys:
        db_type           (str): 'postgresql' | 'mysql' | 'sqlite'
        connection_mode   (str): 'fields' | 'connection_string' | 'connector'
        connector_id      (str): data_connectors row ID (connection_mode=connector)
        connection_string (str): full SQLAlchemy URL (connection_mode=connection_string)
        host              (str): database host (resolved via SSH tunnel if enabled)
        port              (int): database port
        database          (str): database name (or file path for SQLite)
        username          (str): database user
        password          (str): database password
        query             (str): SQL query to execute
        row_limit         (int): max rows to return (default 10 000)

        SSH tunnel (optional):
        use_ssh_tunnel    (bool): enable SSH tunnel
        ssh_host          (str):  SSH server hostname / IP
        ssh_port          (int):  SSH server port (default 22)
        ssh_user          (str):  SSH username
        ssh_password      (str):  SSH password (mutually exclusive with ssh_private_key)
        ssh_private_key   (str):  PEM-encoded RSA private key string
    """

    output_schema = {
        "dataframe":    "DataFrame",
        "metadata":     "dict",
        "preview_rows": "list",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        db_type         = config.get("db_type", "postgresql")
        connection_mode = config.get("connection_mode", "fields")
        row_limit       = int(config.get("row_limit", 10_000))
        query           = str(config.get("query", "")).strip()

        if connection_mode == "connector" or config.get("connector_id"):
            df = self._execute_connector_query(config, query, row_limit)
            return self._build_output(df)

        if not query:
            raise ValueError("DatabaseQueryNode: 'query' is required in config")
        self._assert_read_only_query(query)
        df = self._execute_sql_config(config, str(db_type), connection_mode, query)

        if row_limit and len(df) > row_limit:
            df = df.head(row_limit)

        return self._build_output(df)

    def _execute_sql_config(self, config: Dict[str, Any], db_type: str, connection_mode: str, query: str) -> pd.DataFrame:
        from sqlalchemy import create_engine, text  # lazy import

        with _maybe_ssh_tunnel(config) as (effective_host, effective_port):
            # ── Build connection string ───────────────────────────────────────
            if connection_mode == "connection_string":
                conn_str = self._normalize_connection_string(str(config.get("connection_string", "")))
                if not conn_str:
                    raise ValueError("DatabaseQueryNode: 'connection_string' is required")
            else:
                database = config.get("database", "")
                username = config.get("username", "")
                password = config.get("password", "")

                if db_type == "postgresql":
                    conn_str = f"postgresql+psycopg2://{quote_plus(str(username))}:{quote_plus(str(password))}@{effective_host}:{effective_port}/{database}"
                elif db_type == "mysql":
                    conn_str = f"mysql+pymysql://{quote_plus(str(username))}:{quote_plus(str(password))}@{effective_host}:{effective_port}/{database}"
                elif db_type == "sqlite":
                    conn_str = f"sqlite:///{database}"
                else:
                    raise ValueError(f"DatabaseQueryNode: unsupported db_type '{db_type}'")

            # ── Supabase IPv6 workaround ────────────────────────────────────
            # Supabase direct hosts (db.<ref>.supabase.co) only have AAAA (IPv6)
            # records. Platforms like Railway don't support IPv6, so we auto-
            # rewrite to the Supabase Pooler endpoint which has IPv4.
            # We try multiple pooler prefixes (aws-0, aws-1) since Supabase
            # assigns projects to different pooler instances.
            import re, socket
            supabase_match = re.match(r'^db\.([a-z0-9]+)\.supabase\.co$', effective_host)
            if supabase_match and db_type == "postgresql":
                project_ref = supabase_match.group(1)
                pooler_user = f"{username}.{project_ref}"
                pooler_port = 6543
                # Try each pooler prefix until one accepts the connection
                pooler_prefixes = ["aws-0", "aws-1"]
                connected = False
                last_err = None
                for prefix in pooler_prefixes:
                    pooler_host = f"{prefix}-eu-central-1.pooler.supabase.com"
                    test_str = f"postgresql+psycopg2://{pooler_user}:{password}@{pooler_host}:{pooler_port}/{database}"
                    try:
                        test_engine = create_engine(test_str)
                        with test_engine.connect() as test_conn:
                            test_conn.execute(text("SELECT 1"))
                        test_engine.dispose()
                        conn_str = test_str
                        connected = True
                        break
                    except Exception as e:
                        last_err = e
                        try:
                            test_engine.dispose()
                        except Exception:
                            pass
                if not connected and last_err:
                    raise last_err
            elif db_type == "postgresql":
                try:
                    ipv4 = socket.getaddrinfo(effective_host, effective_port, socket.AF_INET, socket.SOCK_STREAM)[0][4][0]
                    conn_str = conn_str.replace(f"@{effective_host}:", f"@{ipv4}:")
                except (socket.gaierror, IndexError):
                    pass

            # ── Execute query ─────────────────────────────────────────────────
            engine = create_engine(conn_str)
            try:
                with engine.connect() as conn:
                    return pd.read_sql(text(query), conn)
            finally:
                engine.dispose()

    def _normalize_connection_string(self, value: str) -> str:
        value = value.strip()
        if value.startswith("postgres://"):
            return "postgresql+psycopg2://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg2://" + value[len("postgresql://"):]
        return value

    def _execute_connector_query(self, config: Dict[str, Any], query: str, row_limit: int) -> pd.DataFrame:
        connector_id = str(config.get("connector_id") or "").strip()
        if not connector_id:
            raise ValueError("DatabaseQueryNode: connector_id is required")

        from app.dependencies import get_supabase

        supabase = get_supabase()
        lookup = supabase.table("data_connectors").select("*").eq("id", connector_id)
        user_id = config.get("_user_id")
        if user_id:
            lookup = lookup.eq("user_id", str(user_id))
        connector = lookup.single().execute().data
        if not connector:
            raise ValueError("DatabaseQueryNode: connector not found")

        connector_type = connector.get("type")
        connector_config = connector.get("config_json") or {}
        if connector_type == "postgres":
            sql = (query or str(connector_config.get("query") or "select 1 as value")).strip()
            if not sql:
                raise ValueError("DatabaseQueryNode: query is required")
            self._assert_read_only_query(sql)
            df = self._execute_sql_config(
                {"connection_string": connector_config.get("connection_string")},
                "postgresql",
                "connection_string",
                sql,
            )
        elif connector_type == "supabase_table":
            df = self._read_supabase_table(connector_config, row_limit)
        else:
            raise ValueError("DatabaseQueryNode: select a PostgreSQL or Supabase Table connector")

        if row_limit and len(df) > row_limit:
            df = df.head(row_limit)
        return df

    def _read_supabase_table(self, config: Dict[str, Any], row_limit: int) -> pd.DataFrame:
        import httpx

        url = str(config.get("url") or "").rstrip("/")
        key = str(config.get("api_key") or "")
        table = str(config.get("table") or "").strip()
        if not url or not key or not table:
            raise ValueError("DatabaseQueryNode: Supabase url, api key and table are required")

        limit = max(1, min(int(row_limit or 10_000), 50_000))
        response = httpx.get(
            f"{url}/rest/v1/{table}?select=*&limit={limit}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=30,
        )
        response.raise_for_status()
        return pd.DataFrame(response.json())

    def _assert_read_only_query(self, query: str) -> None:
        normalized = " ".join(query.strip().lower().rstrip(";").split())
        if not normalized:
            raise ValueError("DatabaseQueryNode: query is required")
        allowed_prefixes = ("select ", "with ", "show ", "describe ", "explain ")
        if not normalized.startswith(allowed_prefixes):
            raise ValueError("DatabaseQueryNode: only read-only SELECT/WITH queries are allowed")
        forbidden = (" insert ", " update ", " delete ", " drop ", " alter ", " truncate ", " create ", " grant ", " revoke ")
        padded = f" {normalized} "
        if any(term in padded for term in forbidden):
            raise ValueError("DatabaseQueryNode: write or DDL statements are not allowed")
        if ";" in normalized:
            raise ValueError("DatabaseQueryNode: multiple SQL statements are not allowed")

    def _build_output(self, df: pd.DataFrame) -> Dict[str, Any]:
        # ── Build output metadata (same shape as file_upload) ─────────────────
        columns = [
            {
                "name":          col,
                "dtype":         str(df[col].dtype),
                "missing_count": int(df[col].isna().sum()),
                "unique_count":  int(df[col].nunique()),
            }
            for col in df.columns
        ]

        preview_rows = df.head(10).fillna("").astype(str).to_dict("records")

        return {
            "dataframe":    df,
            "metadata": {
                "row_count":    len(df),
                "column_count": len(df.columns),
                "columns":      columns,
            },
            "preview_rows": preview_rows,
        }
