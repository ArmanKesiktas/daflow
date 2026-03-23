"""
In-memory data store used when DEV_MODE=True and no Supabase is configured.
Mimics the Supabase client table API just enough for the routes to work.
Data is persisted to a JSON file so it survives backend restarts.
"""
from __future__ import annotations
import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_PERSIST_FILE = Path("/tmp/daflow_dev_store.json")


def _load_tables() -> dict[str, list[dict]]:
    if _PERSIST_FILE.exists():
        try:
            return defaultdict(list, json.loads(_PERSIST_FILE.read_text()))
        except Exception:
            pass
    return defaultdict(list)


def _save_tables() -> None:
    try:
        _PERSIST_FILE.write_text(json.dumps(dict(_tables)))
    except Exception:
        pass


_tables: dict[str, list[dict]] = _load_tables()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, table_name: str):
        self._table = table_name
        self._filters: list[tuple[str, Any]] = []
        self._in_filters: list[tuple[str, list]] = []
        self._insert_row: dict | None = None
        self._upsert_row: dict | None = None
        self._update_patch: dict | None = None
        self._delete = False
        self._select_cols: str = "*"
        self._single = False
        self._maybe_single = False
        self._limit_n: int | None = None
        self._order_col: str | None = None

    # ── Builder methods ──────────────────────────────────────────
    def select(self, cols: str = "*"):
        self._select_cols = cols
        return self

    def insert(self, row: dict):
        self._insert_row = row
        return self

    def upsert(self, row: dict):
        self._upsert_row = row
        return self

    def update(self, patch: dict):
        self._update_patch = patch
        return self

    def delete(self):
        self._delete = True
        return self

    def eq(self, col: str, val: Any):
        self._filters.append((col, val))
        return self

    def in_(self, col: str, values: list):
        self._in_filters.append((col, values))
        return self

    def single(self):
        self._single = True
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    def order(self, col: str, **_kwargs):
        self._order_col = col
        return self

    # ── Execute ──────────────────────────────────────────────────
    def execute(self) -> _Result:
        rows = _tables[self._table]

        if self._insert_row is not None:
            if "id" not in self._insert_row:
                self._insert_row["id"] = str(uuid.uuid4())
            rows.append(self._insert_row)
            _save_tables()
            return _Result([self._insert_row])

        if self._upsert_row is not None:
            pk = self._upsert_row.get("id")
            for i, r in enumerate(rows):
                if r.get("id") == pk:
                    rows[i] = {**r, **self._upsert_row}
                    _save_tables()
                    return _Result([rows[i]])
            if "id" not in self._upsert_row:
                self._upsert_row["id"] = str(uuid.uuid4())
            rows.append(self._upsert_row)
            _save_tables()
            return _Result([self._upsert_row])

        # Apply filters
        filtered = [
            r for r in rows
            if all(r.get(col) == val for col, val in self._filters)
            and all(r.get(col) in vals for col, vals in self._in_filters)
        ]

        if self._update_patch is not None:
            updated = []
            for i, r in enumerate(rows):
                if all(r.get(col) == val for col, val in self._filters):
                    rows[i] = {**r, **self._update_patch}
                    updated.append(rows[i])
            _save_tables()
            return _Result(updated)

        if self._delete:
            _tables[self._table] = [
                r for r in rows
                if not all(r.get(col) == val for col, val in self._filters)
            ]
            _save_tables()
            return _Result(filtered)

        if self._order_col:
            filtered = sorted(filtered, key=lambda r: r.get(self._order_col, ""), reverse=True)

        if self._limit_n is not None:
            filtered = filtered[: self._limit_n]

        if self._single:
            return _Result(filtered[0] if filtered else None)

        if self._maybe_single:
            return _Result(filtered[0] if filtered else None)

        return _Result(filtered)


class DevStoreClient:
    """Drop-in replacement for the Supabase client in dev mode."""

    def table(self, name: str) -> _Query:
        return _Query(name)

    # Storage stub — returns paths/URLs so routes don't crash
    class _StorageBucket:
        def upload(self, path: str, data: bytes, **_kw):
            return _Result({"path": path})

        def download(self, path: str) -> bytes:
            raise FileNotFoundError(f"Dev store has no file at {path!r}")

        def remove(self, paths: list):
            return _Result(paths)

        def get_public_url(self, path: str) -> str:
            return f"/dev-storage/{path}"

    class _Storage:
        def from_(self, bucket: str):
            return DevStoreClient._StorageBucket()

    @property
    def storage(self):
        return self._Storage()


_dev_client = DevStoreClient()


def get_dev_client() -> DevStoreClient:
    return _dev_client
