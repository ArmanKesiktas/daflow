from contextlib import contextmanager
from typing import Any, Dict, Generator

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
        connection_mode   (str): 'fields' | 'connection_string'
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
        from sqlalchemy import create_engine, text  # lazy import

        db_type         = config.get("db_type", "postgresql")
        connection_mode = config.get("connection_mode", "fields")
        row_limit       = int(config.get("row_limit", 10_000))
        query           = str(config.get("query", "")).strip()

        if not query:
            raise ValueError("DatabaseQueryNode: 'query' is required in config")

        with _maybe_ssh_tunnel(config) as (effective_host, effective_port):
            # ── Build connection string ───────────────────────────────────────
            if connection_mode == "connection_string":
                conn_str = str(config.get("connection_string", ""))
                if not conn_str:
                    raise ValueError("DatabaseQueryNode: 'connection_string' is required")
            else:
                database = config.get("database", "")
                username = config.get("username", "")
                password = config.get("password", "")

                if db_type == "postgresql":
                    conn_str = f"postgresql+psycopg2://{username}:{password}@{effective_host}:{effective_port}/{database}"
                elif db_type == "mysql":
                    conn_str = f"mysql+pymysql://{username}:{password}@{effective_host}:{effective_port}/{database}"
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
                    df = pd.read_sql(text(query), conn)
            finally:
                engine.dispose()

        if row_limit and len(df) > row_limit:
            df = df.head(row_limit)

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
