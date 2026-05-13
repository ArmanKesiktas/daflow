from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class ResetPasswordRequest(BaseModel):
    email: str
    old_password: str
    new_password: str


@router.post("/auth/reset-password-by-email")
async def reset_password_by_email(req: ResetPasswordRequest):
    """Reset user password by email (verify old password first)"""
    if not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service key not configured")

    try:
        # First verify the old password by attempting sign-in
        import httpx
        
        supabase_url = settings.SUPABASE_URL
        supabase_anon_key = settings.SUPABASE_ANON_KEY
        
        verify_headers = {
            "apikey": supabase_anon_key,
            "Authorization": f"Bearer {supabase_anon_key}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            # Verify old password
            verify_response = await client.post(
                f"{supabase_url}/auth/v1/token?grant_type=password",
                headers=verify_headers,
                json={"email": req.email, "password": req.old_password},
            )
            
            if verify_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Get user by email using service key
            admin_headers = {
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            }
            
            user_response = await client.get(
                f"{supabase_url}/auth/v1/admin/users?email={req.email}",
                headers=admin_headers,
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=400, detail="User not found")
            
            users = user_response.json()
            if not users:
                raise HTTPException(status_code=400, detail="User not found")
            
            user_id = users[0]["id"]
            
            # Update password
            update_response = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=admin_headers,
                json={"password": req.new_password},
            )
            
            if update_response.status_code not in [200, 201]:
                raise HTTPException(status_code=400, detail="Password update failed")
            
            return {"message": "Password updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")
