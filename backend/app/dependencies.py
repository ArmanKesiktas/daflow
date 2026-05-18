from __future__ import annotations

import base64
import json
from typing import Optional

import httpx
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.services.dev_store import get_dev_client
from app.services.supabase_service import get_supabase_client

bearer_scheme = HTTPBearer(auto_error=False)

_DEV_USER = {
    "id": "dev-user-00000000-0000-0000-0000-000000000000",
    "email": "dev@localhost",
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    authorization: str | None = Header(default=None),
):
    """Return the current user from a Supabase JWT or the local dev store."""
    if settings.DEV_MODE:
        token: Optional[str] = None
        if credentials and credentials.credentials:
            token = credentials.credentials
        elif authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()

        if token:
            payload = _decode_jwt_without_verification(token)
            user_id = payload.get("sub") or _DEV_USER["id"]
            email = (
                payload.get("email")
                or (payload.get("user_metadata") or {}).get("email")
                or _DEV_USER["email"]
            )
            return {"id": str(user_id), "email": str(email) if email else _DEV_USER["email"]}
        return _DEV_USER

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    token = credentials.credentials

    if settings.SUPABASE_URL and settings.JWT_SECRET in {"", "your-supabase-jwt-secret", "dev-secret-not-for-production", "empty"}:
        apikey = settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY
        if not apikey:
            raise HTTPException(status_code=401, detail="Supabase auth key is not configured")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                    headers={
                        "apikey": apikey,
                        "Authorization": f"Bearer {token}",
                    },
                )
            if response.status_code >= 400:
                raise HTTPException(status_code=401, detail="Could not validate Supabase token")
            data = response.json()
            user_id = data.get("id")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid Supabase user payload")
            return {"id": user_id, "email": data.get("email", "")}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Could not validate Supabase token: {exc}")

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
    """Return Supabase client, or the local in-memory store when unconfigured."""
    if settings.DEV_MODE:
        return get_dev_client()
    client = get_supabase_client()
    if client is None:
        return get_dev_client()
    return client


def _decode_jwt_without_verification(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        payload_b64 = parts[1]
        padding = "=" * (-len(payload_b64) % 4)
        raw = base64.urlsafe_b64decode((payload_b64 + padding).encode("utf-8"))
        payload = json.loads(raw.decode("utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}
