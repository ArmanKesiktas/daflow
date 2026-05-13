from fastapi import APIRouter, Depends, Request

from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


@router.get("/_debug/me")
async def debug_me(request: Request, user: dict = Depends(get_current_user)):
    # return resolved user and raw incoming headers for debugging
    return {"user": user, "dev_mode": settings.DEV_MODE, "headers": dict(request.headers)}
