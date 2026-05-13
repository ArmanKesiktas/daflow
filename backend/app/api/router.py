from fastapi import APIRouter

from app.api.routes import (
    auth,
    dashboards,
    debug,
    executions,
    files,
    join,
    notifications,
    onboarding,
    platform,
    profile,
    reports,
    templates,
    workflows,
    workspaces,
)

api_router = APIRouter()

api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(executions.router, prefix="/executions", tags=["Executions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(workspaces.router, tags=["Workspaces"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
api_router.include_router(profile.router, tags=["Profile"])
api_router.include_router(notifications.router, tags=["Notifications"])
api_router.include_router(platform.router, tags=["Platform"])
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(debug.router, prefix="", tags=["Debug"])
api_router.include_router(join.router, tags=["Join"])
