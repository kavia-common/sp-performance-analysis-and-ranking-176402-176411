from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
from pydantic import BaseModel, Field

from ..config import settings
from ..db import get_db
from ..utils.excel_export import build_excel_from_items
from ..services.ranking_service import (
    create_run,
    get_latest_results,
    get_run_status,
    run_ranking,
)

router = APIRouter(tags=["Rankings"])

class RunRequest(BaseModel):
    formula_mode: str = Field(..., description="Ranking formula mode: buffett | cramer | both")
    options: Dict[str, Any] = Field(default_factory=dict, description="Optional run options/filters")

# PUBLIC_INTERFACE
@router.post(
    "/rankings/run",
    summary="Trigger Ranking Run",
    description="Create a run and start background processing for rankings.",
    operation_id="trigger_ranking_run",
    responses={200: {"description": "Run started", "content": {"application/json": {}}}},
)
async def rankings_run(body: RunRequest, background: BackgroundTasks) -> Dict[str, Any]:
    """Create a run with given formula mode and start background ranking computation."""
    fm = (body.formula_mode or "both").lower()
    if fm not in ("buffett", "cramer", "both"):
        raise HTTPException(status_code=400, detail="Invalid formula_mode")
    run_id = await create_run(fm)
    background.add_task(run_ranking, run_id, fm)
    return {"run_id": run_id, "status": "running"}

# PUBLIC_INTERFACE
@router.get(
    "/rankings/status",
    summary="Run Status",
    description="Get latest or specific run status and progress.",
    operation_id="get_ranking_status",
    responses={200: {"description": "Run status"}},
)
async def rankings_status(run_id: Optional[int] = Query(default=None)) -> Dict[str, Any]:
    """Return status for latest run or specified run_id."""
    st = await get_run_status(run_id)
    if st is None:
        return {"status": "idle"}
    return st

# PUBLIC_INTERFACE
@router.get(
    "/rankings/latest",
    summary="Latest Ranking Results",
    description="Get latest ranking results with pagination, sorting, and optional filters.",
    operation_id="get_latest_rankings",
    responses={200: {"description": "Results page"}},
)
async def rankings_latest(
    page: int = Query(0, ge=0, description="Page index (0-based)"),
    pageSize: int = Query(25, ge=1, le=1000, description="Page size"),
    sortBy: str = Query("combined_rank", description="Sort field"),
    sortDir: str = Query("asc", description="Sort direction asc|desc"),
    formula_mode: str = Query("both", description="Formula mode to view"),
    sectors: Optional[List[str]] = Query(default=None, description="Filter by sectors (repeatable)"),
    marketCapMin: Optional[float] = Query(default=None, description="Minimum market cap"),
    marketCapMax: Optional[float] = Query(default=None, description="Maximum market cap"),
    completeness: Optional[float] = Query(default=None, description="Minimum completeness (0-100)"),
) -> Dict[str, Any]:
    """Return page of latest results."""
    res = await get_latest_results(
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_dir=sortDir,
        formula_mode=formula_mode,
        sectors=sectors,
        market_cap_min=marketCapMin,
        market_cap_max=marketCapMax,
        completeness=completeness,
    )
    return res

# PUBLIC_INTERFACE
@router.get(
    "/rankings/export",
    summary="Export Rankings",
    description="Export rankings for a given run as Excel or CSV.",
    operation_id="export_rankings",
    responses={
        200: {"description": "Excel/CSV file"},
        400: {"description": "Bad request"},
        404: {"description": "Run or data not found"},
    },
)
async def rankings_export(
    run_id: Optional[int] = Query(default=None, description="Run id to export; defaults to latest completed"),
    format: str = Query(default="excel", description="Format: excel|csv"),
):
    """Stream an Excel or CSV export for rankings of the specified/latest completed run."""
    # Resolve run id
    rid = run_id
    if rid is None:
        st = await get_run_status(None)
        # Pick latest completed run
        async with get_db() as db:
            async with db.execute(
                "SELECT id FROM runs WHERE status='completed' ORDER BY started_at DESC, id DESC LIMIT 1"
            ) as cur:
                row = await cur.fetchone()
                rid = row["id"] if row else None
    if rid is None:
        raise HTTPException(status_code=404, detail="No completed run found")

    # Fetch items
    async with get_db() as db2:
        items: List[Dict[str, Any]] = []
        async with db2.execute(
            """
            SELECT symbol, name, sector, market_cap as marketCap, score_buffett, score_cramer, combined_rank, completeness, last_updated
            FROM rankings WHERE run_id=? ORDER BY combined_rank ASC
            """,
            (rid,),
        ) as cur2:
            async for r in cur2:
                items.append({k: r[k] for k in r.keys()})

    if not items:
        raise HTTPException(status_code=404, detail="No data for this run")

    fmt = (format or "excel").lower()
    filename = f"sp_rankings_run_{rid}.{ 'csv' if fmt == 'csv' else 'xlsx'}"
    if fmt == "csv":
        # Build CSV inline
        import csv
        from io import StringIO

        headers = list({k for row in items for k in row.keys()})
        sio = StringIO()
        writer = csv.DictWriter(sio, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in items:
            writer.writerow(row)
        data = sio.getvalue().encode("utf-8")
        return Response(
            content=data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Excel
    xbytes = build_excel_from_items(items, sheet_name="Rankings")
    return Response(
        content=xbytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
