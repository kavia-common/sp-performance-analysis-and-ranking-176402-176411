import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx
import aiosqlite

from ..config import settings
from ..db import get_db

BASE_URL = "https://finnhub.io/api/v1"

class RateLimiter:
    """Simple token-bucket style limiter per time window to avoid hitting API hard limits."""
    def __init__(self, rate_per_sec: float = 4.0):
        self.rate = rate_per_sec
        self._last = 0.0

    async def wait(self):
        now = time.monotonic()
        gap = 1.0 / max(self.rate, 0.1)
        sleep_for = max(0.0, (self._last + gap) - now)
        if sleep_for > 0:
            await asyncio.sleep(sleep_for)
        self._last = time.monotonic()

class FinnhubClient:
    """Finnhub API client with simple caching into SQLite and basic rate limiting."""
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.FINNHUB_API_KEY
        self._limiter = RateLimiter(rate_per_sec=4.0)  # modest pacing
        self._client = httpx.AsyncClient(timeout=20.0)

    async def _get(self, path: str, params: Dict[str, Any]) -> Any:
        if not self.api_key:
            raise RuntimeError("FINNHUB_API_KEY is not configured")
        await self._limiter.wait()
        q = dict(params or {})
        q["token"] = self.api_key
        url = f"{BASE_URL}{path}"
        for attempt in range(3):
            try:
                resp = await self._client.get(url, params=q)
                if resp.status_code == 429:
                    await asyncio.sleep(1 + attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError:
                if attempt == 2:
                    raise
                await asyncio.sleep(0.5 * (attempt + 1))
        return None

    # PUBLIC_INTERFACE
    async def get_symbol_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch latest quote for a symbol (cached by date could be extended)."""
        # This demo uses direct fetch; caching level can be expanded if needed
        try:
            data = await self._get("/quote", {"symbol": symbol})
            return data
        except Exception:
            return None

    # PUBLIC_INTERFACE
    async def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch company profile info for sector and name."""
        try:
            data = await self._get("/stock/profile2", {"symbol": symbol})
            return data
        except Exception:
            return None

    # PUBLIC_INTERFACE
    async def get_financials(self, symbol: str, period: str = "annual") -> List[Dict[str, Any]]:
        """Fetch financials and cache them keyed by symbol/period/fiscalDate."""
        try:
            await self._ensure_cache_tables()
            data = await self._get("/stock/financials-reported", {"symbol": symbol})
            reports = (data or {}).get("data", []) or []
            rows: List[Dict[str, Any]] = []
            async with get_db() as db:
                for rep in reports:
                    fiscal_date = rep.get("reportDate") or rep.get("period") or ""
                    key = (symbol, period, fiscal_date)
                    exists = await self._cache_financial_exists(db, *key)
                    if not exists:
                        await db.execute(
                            "INSERT OR IGNORE INTO cache_financials(symbol, period, fiscal_date, data_json) VALUES (?,?,?,?)",
                            (symbol, period, fiscal_date, json.dumps(rep)),
                        )
                await db.commit()
                # read back compacted for caller
                async with db.execute(
                    "SELECT symbol, period, fiscal_date, data_json FROM cache_financials WHERE symbol=? AND period=? ORDER BY fiscal_date DESC",
                    (symbol, period),
                ) as cur:
                    async for row in cur:
                        try:
                            rows.append(json.loads(row["data_json"]))
                        except Exception:
                            continue
            return rows
        except Exception:
            return []

    # PUBLIC_INTERFACE
    async def get_key_metrics(self, symbol: str) -> Dict[str, Optional[float]]:
        """Fetch select metrics and cache them per day."""
        metrics: Dict[str, Optional[float]] = {}
        try:
            await self._ensure_cache_tables()
            payload = await self._get("/stock/metric", {"symbol": symbol, "metric": "all"})
            data = (payload or {}).get("metric", {}) or {}
            # Select a few metrics for demo scoring
            for name in ["peBasicExclExtraTTM", "roeTTM", "roaTTM", "netMarginTTM", "totalDebt/totalEquityAnnual"]:
                val = data.get(name)
                metrics[name] = float(val) if isinstance(val, (int, float)) else None
            # Cache
            today = time.strftime("%Y-%m-%d")
            async with get_db() as db:
                for k, v in metrics.items():
                    await db.execute(
                        "INSERT OR REPLACE INTO cache_metrics(symbol, metric_name, metric_value, as_of) VALUES (?,?,?,?)",
                        (symbol, k, v, today),
                    )
                await db.commit()
        except Exception:
            pass
        return metrics

    async def _cache_financial_exists(self, db: aiosqlite.Connection, symbol: str, period: str, fiscal_date: str) -> bool:
        async with db.execute(
            "SELECT 1 FROM cache_financials WHERE symbol=? AND period=? AND fiscal_date=?",
            (symbol, period, fiscal_date),
        ) as cur:
            return (await cur.fetchone()) is not None

    async def _ensure_cache_tables(self):
        # Tables are created by schema; just a sanity query
        async with get_db() as db:
            await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cache_financials'")
            await db.commit()

    async def aclose(self):
        await self._client.aclose()
