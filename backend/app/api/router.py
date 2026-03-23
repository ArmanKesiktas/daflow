from fastapi import APIRouter

from app.api.routes import workflows, executions, files, reports, dashboards

api_router = APIRouter()

api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(executions.router, prefix="/executions", tags=["Executions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
