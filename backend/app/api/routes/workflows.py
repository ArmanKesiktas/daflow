import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowListItem,
    WorkflowResponse,
    WorkflowSave,
)

router = APIRouter()


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    payload: WorkflowCreate,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    wf_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    graph_data = {
        "nodes": [n.model_dump() for n in payload.nodes],
        "edges": [e.model_dump() for e in payload.edges],
        "viewport": payload.viewport.model_dump(),
    }
    supabase.table("workflows").insert({
        "id": wf_id,
        "user_id": user["id"],
        "name": payload.name,
        "description": payload.description,
        "graph_data": graph_data,
        "created_at": now,
        "updated_at": now,
    }).execute()

    return _build_response(wf_id, payload.name, payload.description, graph_data, user["id"], now, now)


@router.get("/", response_model=List[WorkflowListItem])
async def list_workflows(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("workflows")
        .select("id, name, description, graph_data, updated_at")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    items = []
    for row in result.data:
        node_count = len(row.get("graph_data", {}).get("nodes", []))
        items.append(WorkflowListItem(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            node_count=node_count,
            updated_at=row["updated_at"],
        ))
    return items


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _fetch_workflow(workflow_id, user["id"], supabase)
    gd = row.get("graph_data", {})
    return _build_response(
        row["id"], row["name"], row.get("description"),
        gd, row["user_id"], row["created_at"], row["updated_at"],
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def save_workflow(
    workflow_id: str,
    payload: WorkflowSave,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Ensure ownership
    _fetch_workflow(workflow_id, user["id"], supabase)

    now = datetime.now(timezone.utc).isoformat()
    graph_data = {
        "nodes": [n.model_dump() for n in payload.nodes],
        "edges": [e.model_dump() for e in payload.edges],
        "viewport": payload.viewport.model_dump(),
    }
    update_payload = {"graph_data": graph_data, "updated_at": now}
    if payload.name:
        update_payload["name"] = payload.name
    if payload.description is not None:
        update_payload["description"] = payload.description

    supabase.table("workflows").update(update_payload).eq("id", workflow_id).execute()

    row = _fetch_workflow(workflow_id, user["id"], supabase)
    return _build_response(
        row["id"], row["name"], row.get("description"),
        graph_data, row["user_id"], row["created_at"], row["updated_at"],
    )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    _fetch_workflow(workflow_id, user["id"], supabase)
    supabase.table("workflows").delete().eq("id", workflow_id).execute()
    return {"deleted": workflow_id}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_workflow(workflow_id: str, user_id: str, supabase) -> dict:
    result = (
        supabase.table("workflows")
        .select("*")
        .eq("id", workflow_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, f"Workflow '{workflow_id}' not found")
    return result.data


def _build_response(wf_id, name, description, graph_data, user_id, created_at, updated_at):
    from app.schemas.workflow import WorkflowNode, WorkflowEdge, Viewport, NodePosition

    def parse_nodes(raw):
        nodes = []
        for n in raw:
            pos = n.get("position", {})
            nodes.append(WorkflowNode(
                id=n["id"], type=n.get("type", ""),
                position=NodePosition(x=pos.get("x", 0), y=pos.get("y", 0)),
                data=n.get("data", {}),
            ))
        return nodes

    def parse_edges(raw):
        return [WorkflowEdge(**e) for e in raw]

    vp = graph_data.get("viewport", {})
    return WorkflowResponse(
        id=wf_id,
        name=name,
        description=description,
        nodes=parse_nodes(graph_data.get("nodes", [])),
        edges=parse_edges(graph_data.get("edges", [])),
        viewport=Viewport(x=vp.get("x", 0), y=vp.get("y", 0), zoom=vp.get("zoom", 1)),
        user_id=user_id,
        created_at=created_at,
        updated_at=updated_at,
    )
