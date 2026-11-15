import os
import sqlite3
from pathlib import Path

DB_PATH = os.getenv("SQLITE_PATH", "/data/hoops.db")
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    schema_sql = SCHEMA_PATH.read_text()
    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()
        _run_migrations(conn)
    finally:
        conn.close()


def _run_migrations(conn):
    """Apply lightweight, idempotent migrations for existing databases
    that predate a given column/table."""
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(games)")}
    if "is_archived" not in columns:
        conn.execute(
            "ALTER TABLE games ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0"
        )
        conn.commit()
