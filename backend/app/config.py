from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DataFlow Platform"
    APP_VERSION: str = "1.0.0"

    # Dev mode — bypasses JWT auth, uses fake user
    DEV_MODE: bool = False

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    # Database (direct connection)
    DATABASE_URL: str = ""

    # JWT Auth
    JWT_SECRET: str = "dev-secret-not-for-production"
    JWT_ALGORITHM: str = "HS256"

    # Storage
    STORAGE_BUCKET_DATASETS: str = "datasets"
    STORAGE_BUCKET_OUTPUTS: str = "outputs"
    STORAGE_BUCKET_REPORTS: str = "reports"

    # AI Services
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_AI_PROVIDER: str = "gemini"  # gemini | openai

    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — add your Railway URL here via env var or extend the list
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    EXTRA_ORIGINS: str = ""  # comma-separated, set in Railway env vars

    @property
    def all_origins(self) -> List[str]:
        extra = [o.strip() for o in self.EXTRA_ORIGINS.split(",") if o.strip()]
        return self.ALLOWED_ORIGINS + extra

    # Execution
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_ROWS_PREVIEW: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
