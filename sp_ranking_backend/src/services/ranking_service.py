import asyncio
import math
import time
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite

from ..config import settings
from ..db import get_db
from .batching import run_in_batches
from .finnhub_client import FinnhubClient

def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None

def _buffett_score(metrics: Dict[str, Optional[float]]) -> float:
    """Toy scoring inspired by quality metrics: ROE, ROA, margins higher is better; lower debt better."""
    score = 0.0
    roe = metrics.get("roeTTM") or 0.0
    roa = metrics.get("roaTTM") or 0.0
    margin = metrics.get("netMarginTTM") or 0.0
    debt_eq = metrics.get("totalDebt/totalEquityAnnual")
    score += max(0.0, roe) * 0.4
    score += max(0.0, roa) * 0.3
    score += max(0.0, margin) * 0.3
    if debt_eq is not None:
        score += max(0.0, 50.0 - min(50.0, max(0.0, debt_eq)))  # prefer lower debt to equity
    return round(score, 3)

def _cramer_score(metrics: Dict[str, Optional[float]]) -> float:
    """Toy scoring: P/E reasonable and growth proxies; lower PE is better within a band."""
    pe = metrics.get("peBasicExclExtraTTM")
    margin = metrics.get("netMarginTTM") or 0.0
    score = 0.0
    if pe is not None and pe > 0:
        if pe < 10:
            score += 50
        elif pe < 20:
            score += 40
        elif pe < 30:
            score += 30
        elif pe < 40:
            score += 20
        else:
            score += 10
    score += max(0.0, margin)
    return round(score, 3)

async def _list_symbols() -> List[Dict[str, Any]]:
    async with get_db() as db:
        items: List[Dict[str, Any]] = []
        async with db.execute("SELECT symbol, name, sector, market_cap FROM symbols ORDER BY symbol") as cur:
            async for row in cur:
                items.append(
                    {
                        "symbol": row["symbol"],
                        "name": row["name"],
                        "sector": row["sector"],
                        "market_cap": row["market_cap"],
                    }
                )
        return items

# PUBLIC_INTERFACE
async def create_run(formula_mode: str) -> int:
    """Create a run record with queued status and return run id."""
    async with get_db() as db:
        cur = await db.execute(
            "INSERT INTO runs(formula_mode, status, progress, message, started_at) VALUES (?,?,?,?, CURRENT_TIMESTAMP)",
            (formula_mode, "queued", 0, None),
        )
        await db.commit()
        return cur.lastrowid

# PUBLIC_INTERFACE
async def update_run(run_id: int, status: str, progress: int = 0, message: Optional[str] = None) -> None:
    """Update run status/progress/message."""
    async with get_db() as db:
        await db.execute(
            "UPDATE runs SET status=?, progress=?, message=?, finished_at = CASE WHEN ? IN ('completed','failed') THEN CURRENT_TIMESTAMP ELSE finished_at END WHERE id=?",
            (status, progress, message, status, run_id),
        )
        await db.commit()

# PUBLIC_INTERFACE
async def get_run_status(run_id: Optional[int]) -> Optional[Dict[str, Any]]:
    """Get current run status."""
    if run_id is None:
        async with get_db() as db:
            async with db.execute("SELECT id, status, progress, message, formula_mode FROM runs ORDER BY id DESC LIMIT 1") as cur:
                row = await cur.fetchone()
                if row is None:
                    return None
                return {"run_id": row["id"], "status": row["status"], "progress": row["progress"], "message": row["message"], "formula_mode": row["formula_mode"]}
    async with get_db() as db:
        async with db.execute("SELECT id, status, progress, message, formula_mode FROM runs WHERE id=?", (run_id,)) as cur:
            row = await cur.fetchone()
            if row is None:
                return None
            return {"run_id": row["id"], "status": row["status"], "progress": row["progress"], "message": row["message"], "formula_mode": row["formula_mode"]}

# PUBLIC_INTERFACE
async def run_ranking(run_id: int, formula_mode: str) -> None:
    """Compute rankings for all symbols and store in rankings table."""
    await update_run(run_id, "running", 0, "Starting")
    symbols = await _list_symbols()
    total = len(symbols)
    if total == 0:
        await update_run(run_id, "failed", 0, "No symbols available")
        return

    client = FinnhubClient()
    processed = 0

    async def handle_batch(batch: List[Dict[str, Any]]) -> List[Tuple[str, Dict[str, Optional[float]]]]:
        items: List[Tuple[str, Dict[str, Optional[float]]]] = []
        for rec in batch:
            sym = rec["symbol"]
            metrics = await client.get_key_metrics(sym)
            items.append((sym, metrics))
        return items

    try:
        metrics_list = await run_in_batches(
            items=symbols,
            handler=handle_batch,
            batch_size=max(1, settings.BATCH_SIZE),
            max_concurrency=max(1, settings.MAX_CONCURRENCY),
        )
        # Map symbol->metrics
        sym_to_metrics = {sym: m for (sym, m) in metrics_list}

        # Compute scores
        results = []
        for rec in symbols:
            sym = rec["symbol"]
            name = rec.get("name")
            sector = rec.get("sector")
            mc = rec.get("market_cap")
            metrics = sym_to_metrics.get(sym, {})
            sb = _buffett_score(metrics) if formula_mode in ("buffett", "both") else None
            sc = _cramer_score(metrics) if formula_mode in ("cramer", "both") else None
            # completeness: share of metrics present
            total_fields = 5
            have_fields = sum(1 for k in ["roeTTM", "roaTTM", "netMarginTTM", "peBasicExclExtraTTM", "totalDebt/totalEquityAnnual"] if metrics.get(k) is not None)
            completeness = round((have_fields / total_fields) * 100.0, 1)
            results.append(
                {
                    "symbol": sym,
                    "name": name,
                    "sector": sector,
                    "market_cap": mc,
                    "score_buffett": sb,
                    "score_cramer": sc,
                    "completeness": completeness,
                }
            )
            processed += 1
            if processed % max(1, total // 10) == 0:
                pct = int((processed / total) * 100)
                await update_run(run_id, "running", pct, f"Processed {processed}/{total}")

        # Rank combined: lower rank is better; sort by sum of normalized ranks
        # Create rank by each available score (descending)
        def rank_scores(vals: List[Optional[float]]) -> List[int]:
            pairs = [(i, v if v is not None else float("-inf")) for i, v in enumerate(vals)]
            pairs.sort(key=lambda x: x[1], reverse=True)
            ranks = [0] * len(vals)
            for r, (i, _v) in enumerate(pairs, start=1):
                ranks[i] = r
            return ranks

        buff_vals = [r["score_buffett"] for r in results]
        cram_vals = [r["score_cramer"] for r in results]
        rb = rank_scores(buff_vals)
        rc = rank_scores(cram_vals)

        for idx, r in enumerate(results):
            if formula_mode == "buffett":
                combined = rb[idx]
            elif formula_mode == "cramer":
                combined = rc[idx]
            else:
                combined = rb[idx] + rc[idx]
            r["combined_rank"] = combined

        # Persist to rankings
        async with get_db() as db:
            # Clean previous rankings for this run just in case
            await db.execute("DELETE FROM rankings WHERE run_id=?", (run_id,))
            for r in results:
                await db.execute(
                    """
                    INSERT INTO rankings(run_id, symbol, name, sector, market_cap, score_buffett, score_cramer, combined_rank, completeness, last_updated)
                    VALUES (?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
                    """,
                    (
                        run_id,
                        r["symbol"],
                        r["name"],
                        r["sector"],
                        r["market_cap"],
                        r.get("score_buffett"),
                        r.get("score_cramer"),
                        r.get("combined_rank"),
                        r.get("completeness"),
                    ),
                )
            await db.commit()
        await update_run(run_id, "completed", 100, "Done")
    except Exception as e:
        await update_run(run_id, "failed", 0, f"Error: {e}")
    finally:
        try:
            await client.aclose()
        except Exception:
            pass

# PUBLIC_INTERFACE
async def get_latest_results(
    page: int = 0,
    page_size: int = 25,
    sort_by: str = "combined_rank",
    sort_dir: str = "asc",
    formula_mode: str = "both",
    sectors: Optional[List[str]] = None,
    market_cap_min: Optional[float] = None,
    market_cap_max: Optional[float] = None,
    completeness: Optional[float] = None,
) -> Dict[str, Any]:
    """Get latest run results with pagination and filtering."""
    async with get_db() as db:
        # Find latest completed run by formula_mode
        async with db.execute(
            "SELECT id FROM runs WHERE status='completed' AND formula_mode=? ORDER BY started_at DESC, id DESC LIMIT 1",
            (formula_mode,),
        ) as cur:
            row = await cur.fetchone()
            if row is None:
                # fallback to any latest completed
                async with db.execute(
                    "SELECT id FROM runs WHERE status='completed' ORDER BY started_at DESC, id DESC LIMIT 1"
                ) as cur2:
                    row = await cur2.fetchone()
        if row is None:
            return {"items": [], "total": 0, "run_id": None}

        run_id = row["id"]
        where = ["run_id=?"]
        params: List[Any] = [run_id]
        if sectors:
            qs = ",".join("?" * len(sectors))
            where.append(f"sector IN ({qs})")
            params.extend(sectors)
        if market_cap_min is not None and market_cap_min != "":
            where.append("market_cap >= ?")
            params.append(float(market_cap_min))
        if market_cap_max is not None and market_cap_max != "":
            where.append("market_cap <= ?")
            params.append(float(market_cap_max))
        if completeness is not None and completeness != "":
            where.append("completeness >= ?")
            params.append(float(completeness))
        where_sql = " AND ".join(where) if where else "1=1"

        # total
        async with get_db() as db2:
            async with db2.execute(f"SELECT COUNT(1) AS c FROM rankings WHERE {where_sql}", params) as cur3:
                total_row = await cur3.fetchone()
                total = total_row["c"] if total_row else 0

            # sorting safety
            allowed = {"symbol", "name", "sector", "market_cap", "score_buffett", "score_cramer", "combined_rank", "completeness", "last_updated"}
            sby = sort_by if sort_by in allowed else "combined_rank"
            sdir = "DESC" if (str(sort_dir).lower() == "desc") else "ASC"

            offset = max(0, page) * max(1, page_size)
            limit = max(1, page_size)

            sql = f"""
                SELECT symbol, name, sector, market_cap, score_buffett, score_cramer, combined_rank, completeness, last_updated
                FROM rankings WHERE {where_sql}
                ORDER BY {sby} {sdir}
                LIMIT ? OFFSET ?
            """
            qparams = params + [limit, offset]
            items: List[Dict[str, Any]] = []
            async with db2.execute(sql, qparams) as cur4:
                async for r in cur4:
                    items.append(
                        {
                            "symbol": r["symbol"],
                            "name": r["name"],
                            "sector": r["sector"],
                            "marketCap": r["market_cap"],
                            "score_buffett": r["score_buffett"],
                            "score_cramer": r["score_cramer"],
                            "combined_rank": r["combined_rank"],
                            "completeness": r["completeness"],
                            "last_updated": r["last_updated"],
                        }
                    )
        return {"items": items, "total": total, "run_id": run_id}
