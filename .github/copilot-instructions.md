# Daflow — AI Coding Agent Instructions

## Architecture
Daflow is a **visual data analysis workflow platform** — a drag-and-drop DAG builder (React Flow) that executes node pipelines on a Python backend. Frontend (React/Vite :5173) proxies `/api` requests to backend (FastAPI/Uvicorn :8000). Real-time execution updates use **SSE** (`GET /api/executions/{id}/stream`), not WebSockets.

## Starting Dev Servers
```bash
# Terminal 1 — Backend
cd backend && PYTHONDONTWRITEBYTECODE=1 DEV_MODE=True .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend && npx vite --port 5173
```
`DEV_MODE=True` bypasses Supabase auth and uses in-memory store (persisted to `/tmp/daflow_dev_store.json`). Files are stored at `/tmp/dataflow_dev_uploads/` with `dev://` URI prefix.

## Node System — The Core Abstraction
12 node types across 4 categories: **source** (file_upload), **preparation** (column_type_detection, missing_value, duplicate_detection, filter_rows), **analysis** (statistics, anomaly_detection, correlation, distribution), **output** (dashboard, report, ai_insights).

### Adding a New Node Type
1. **Backend**: Create `backend/app/nodes/<category>/my_node.py` inheriting `BaseNodeProcessor` from `app/nodes/base.py`. Implement `input_schema`, `output_schema`, and `execute(inputs, config) -> dict`.
2. **Register**: In `backend/app/nodes/__init__.py`, add `"my_node": MyNodeProcessor()` to `NODE_REGISTRY`.
3. **Frontend component**: Create in `frontend/src/components/nodes/`. Use `createAnalysisNode()` factory from `AnalysisNodes.tsx` for simple nodes, or `BaseNode` wrapper for custom ones.
4. **Register**: Add to `nodeTypes` in `frontend/src/components/nodes/nodeTypes.ts` and node definitions in `NodePanel.tsx`.
5. **Critical**: The string key must match exactly in `NODE_REGISTRY`, `nodeTypes`, and `NodePanel` definitions.

### Node Execution Flow
`ExecutionEngine` (in `backend/app/core/engine.py`) topologically sorts the DAG → for each node: gathers upstream outputs via handle names → calls `processor.execute(inputs, config)` → caches output → emits status via SSE. The `"dataframe"` key is the standard passthrough between nodes.

## Frontend Conventions
- **State**: Two Zustand stores — `flowStore` (canvas/graph state) and `executionStore` (run status, node statuses)
- **Styling**: Tailwind CSS with Apple-inspired palette: primary `#0071E3`, success `#30D158`, error `#FF453A`, bg `#F5F5F7`/`#111113`. Dark mode via `dark:` prefix. Frosted glass: `backdrop-blur-xl bg-white/95`.
- **i18n**: Custom context-based system in `src/i18n/index.tsx` — `useI18n()` hook returns `{ t, lang, setLang }`. EN/TR supported.
- **Charts**: Chart.js 4 + react-chartjs-2. Components in `src/components/charts/`. Global registration in `chartSetup.ts`.
- **TypeScript**: 100% TS, strict types in `src/types/workflow.ts`. React Flow generics: `NodeProps<Node<NodeData>>`.
- **Routing**: `/workflows` → list, `/workflows/:id/edit` → editor, `/dashboard/:executionId` → dashboard, `/reports` → list, `/reports/:id` → detail.

## Backend Conventions
- **Absolute imports** from `app` root: `from app.nodes.base import BaseNodeProcessor`
- **Schemas**: Pydantic v2 models in `app/schemas/` with `model_config = ConfigDict(from_attributes=True)`
- API routes under `/api` prefix: `/api/files/`, `/api/workflows/`, `/api/executions/`, `/api/reports/`
- `_serialize_node_output()` in `executions.py` strips DataFrames to `{_type: "dataframe", rows, columns, sample}` before JSON storage

## Vite Proxy
`vite.config.ts` proxies `/api` → `http://localhost:8000`. The Axios client (`src/api/client.ts`) uses `baseURL: '/api'` — never hardcode backend URLs.

## Database
5 tables: `workflows`, `workflow_executions`, `node_execution_results`, `uploaded_files`, `reports`. In DEV_MODE, `DevStoreClient` in `app/services/dev_store.py` mimics Supabase's `.table().select().eq().execute()` chain API.

## No Tests
No test framework is currently configured. Verify changes with `cd frontend && npx tsc --noEmit` for TypeScript checks.
