from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.router import api_router
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    if settings.DEV_MODE:
        logger.warning("⚠️  DEV_MODE is enabled — authentication is bypassed. Do NOT use in production!")
    stop_event = asyncio.Event()
    scheduler_task = None
    if settings.DEV_MODE:
        from app.services.scheduler import scheduler_loop
        scheduler_task = asyncio.create_task(scheduler_loop(stop_event))
    yield
    # Shutdown
    stop_event.set()
    if scheduler_task:
        scheduler_task.cancel()
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Visual drag-and-drop data analysis workflow platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

static_path = os.path.join(os.path.dirname(__file__), "..", "static_files")
if os.path.isdir(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
