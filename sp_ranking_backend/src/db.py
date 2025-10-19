import asyncio
import aiosqlite
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from .config import settings

SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "schema.sql")

async def _run_pragmas(conn: aiosqlite.Connection) -> None:
    """Set SQLite pragmas for performance and integrity."""
    await conn.execute("PRAGMA journal_mode=WAL;")
    await conn.execute("PRAGMA synchronous=NORMAL;")
    await conn.execute("PRAGMA foreign_keys=ON;")
    await conn.commit()

# PUBLIC_INTERFACE
@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """Yield an aiosqlite connection. Ensures pragmas are set."""
    db_url = settings.DB_URL
    if not db_url.startswith("sqlite:///"):
        raise ValueError("Only sqlite URLs are supported in this scaffold (sqlite:///path.db)")

    db_path = db_url.replace("sqlite:///", "")
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    try:
        await _run_pragmas(conn)
        yield conn
    finally:
        await conn.close()

# PUBLIC_INTERFACE
async def init_db(schema_path: Optional[str] = None) -> None:
    """Initialize database by applying schema.sql if tables are missing."""
    path = schema_path or SCHEMA_PATH
    db_url = settings.DB_URL
    if not db_url.startswith("sqlite:///"):
        # For now, only sqlite supported in scaffold
        return
    db_path = db_url.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    async with aiosqlite.connect(db_path) as conn:
        await _run_pragmas(conn)
        # Check for a known table existence
        async with conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='symbols'") as cursor:
            row = await cursor.fetchone()
        if row is None:
            # Apply schema
            with open(path, "r", encoding="utf-8") as f:
                sql = f.read()
            await conn.executescript(sql)
            await conn.commit()

# Helper to run init synchronously if needed (e.g., on startup hooks)
def init_db_sync() -> None:
    """Run init_db in a new event loop when called from sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule as a task
            asyncio.create_task(init_db())
        else:
            loop.run_until_complete(init_db())
    except RuntimeError:
        asyncio.run(init_db())
