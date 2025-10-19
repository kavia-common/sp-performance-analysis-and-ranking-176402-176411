from fastapi import APIRouter

# PUBLIC_INTERFACE
def get_api_router() -> APIRouter:
    """Return the root API router. Subrouters will be included here as the app grows."""
    router = APIRouter()
    return router
