-- ============================================================
-- Migration 001: Initial Schema
-- DataFlow Platform - Visual Data Analysis Workflow
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Workflows ───────────────────────────────────────────────
-- Stores the entire React Flow graph as JSONB for fast serialization.
-- Normalized node/edge tables are kept for queryability.

CREATE TABLE IF NOT EXISTS workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL,  -- References auth.users(id)
    name        TEXT NOT NULL,
    description TEXT,
    -- Full React Flow state (nodes[], edges[], viewport)
    graph_data  JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC);

-- ─── Workflow Executions ──────────────────────────────────────
-- Each time a user runs a workflow, a record is created here.

CREATE TABLE IF NOT EXISTS workflow_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending|running|success|error
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    result_summary  JSONB DEFAULT '{}',   -- High-level stats/output refs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);

-- ─── Node Execution Results ───────────────────────────────────
-- Stores per-node output/metrics for a given execution run.

CREATE TABLE IF NOT EXISTS node_execution_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id    UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id         TEXT NOT NULL,        -- React Flow node ID
    node_type       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending|running|success|error
    output_ref      TEXT,                 -- Supabase Storage path (e.g. executions/{exec_id}/{node_id}.parquet)
    output_json     JSONB DEFAULT '{}',   -- Serializable output (stats, anomaly summary, etc.)
    metrics         JSONB DEFAULT '{}',   -- Row counts, timing, etc.
    error_message   TEXT,
    executed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_results_execution_id ON node_execution_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_results_node_id ON node_execution_results(node_id);

-- ─── Reports ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id    UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    workflow_id     UUID REFERENCES workflows(id) ON DELETE SET NULL,
    user_id         UUID NOT NULL,
    title           TEXT NOT NULL,
    format          TEXT NOT NULL DEFAULT 'pdf',   -- pdf | json
    storage_path    TEXT,                          -- Supabase Storage path for PDF
    report_data     JSONB DEFAULT '{}',            -- Full JSON report structure
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_execution_id ON reports(execution_id);

-- ─── Uploaded Files Registry ──────────────────────────────────

CREATE TABLE IF NOT EXISTS uploaded_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    filename        TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    size_bytes      BIGINT DEFAULT 0,
    row_count       INT DEFAULT 0,
    column_count    INT DEFAULT 0,
    columns_meta    JSONB DEFAULT '[]',   -- [{name, dtype, missing_count}]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON uploaded_files(user_id);

-- ─── Auto-update updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
