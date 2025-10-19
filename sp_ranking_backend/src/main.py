from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routes.health import router as health_router

openapi_tags = [
    {"name": "Health", "description": "Service health and readiness probes."},
    {"name": "Symbols", "description": "Symbol directory and sector metadata."},
    {"name": "Rankings", "description": "Ranking runs, status, results, and exports."},
]

# PUBLIC_INTERFACE
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="S&P Ranking Backend",
        description="Backend service for S&P performance analysis and ranking.",
        version="0.1.0",
        openapi_tags=openapi_tags,
    )

    # CORS
    origins = settings.ALLOWED_ORIGINS or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health_router)

    @app.on_event("startup")
    async def on_startup():
        # Initialize DB (creates tables if missing)
        await init_db()

    return app

app = create_app()
