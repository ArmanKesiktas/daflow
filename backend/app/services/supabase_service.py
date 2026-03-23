from app.config import settings

_supabase_client = None


def get_supabase_client():
    """Return a Supabase client, or None when credentials are not configured (dev mode)."""
    global _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None  # DEV_MODE — callers receive the dev store instead

    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
        )
    return _supabase_client
