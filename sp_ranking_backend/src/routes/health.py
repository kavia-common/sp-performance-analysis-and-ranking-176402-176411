from fastapi import APIRouter

router = APIRouter(tags=["Health"])

# PUBLIC_INTERFACE
@router.get(
    "/health",
    summary="Health Check",
    description="Simple health check endpoint to verify the backend is running.",
    operation_id="get_health_status",
    responses={
        200: {
            "description": "Backend is healthy",
            "content": {
                "application/json": {
                    "example": {"status": "ok"}
                }
            },
        }
    },
)
def health():
    """Return a simple OK status."""
    return {"status": "ok"}
