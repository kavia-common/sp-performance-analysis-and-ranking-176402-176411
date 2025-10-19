from typing import Any, Dict, List

from fastapi import APIRouter
from ..db import get_db

router = APIRouter(tags=["Symbols"])

# PUBLIC_INTERFACE
@router.get(
    "/symbols",
    summary="List Symbols",
    description="Return available symbols with basic metadata and derived sectors list.",
    operation_id="list_symbols",
    responses={200: {"description": "Symbols list"}},
)
async def list_symbols() -> Dict[str, Any]:
    """Fetch symbols and derived unique sectors."""
    items: List[Dict[str, Any]] = []
    async with get_db() as db:
        async with db.execute("SELECT symbol, name, sector, market_cap FROM symbols ORDER BY symbol") as cur:
            async for row in cur:
                items.append(
                    {
                        "symbol": row["symbol"],
                        "name": row["name"],
                        "sector": row["sector"],
                        "marketCap": row["market_cap"],
                    }
                )
    sectors = sorted(list({it["sector"] for it in items if it.get("sector")}))
    return {"symbols": items, "sectors": sectors}
