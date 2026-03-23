from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.config import settings
from app.services.supabase_service import get_supabase_client
from app.services.dev_store import get_dev_client

bearer_scheme = HTTPBearer(auto_error=False)

# Fixed dev user used when DEV_MODE=True or no Supabase is configured
_DEV_USER = {"id": "dev-user-00000000-0000-0000-0000-000000000000", "email": "dev@localhost"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Decode Supabase JWT and return user payload.

    When DEV_MODE=True, accepts any token (or no token) and returns a
    fixed dev user so the app works without a real Supabase project.
    """
    if settings.DEV_MODE:
        return _DEV_USER

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"id": user_id, "email": payload.get("email", "")}
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {exc}",
        )


def get_supabase():
    """Return Supabase client, or the in-memory dev store when in DEV_MODE or unconfigured."""
    if settings.DEV_MODE:
        return get_dev_client()
    client = get_supabase_client()
    if client is None:
        return get_dev_client()
    return client
