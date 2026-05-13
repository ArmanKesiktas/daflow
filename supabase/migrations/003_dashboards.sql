-- ============================================================
-- Migration 003: Persisted Dashboards
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboards (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id      UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_id       UUID REFERENCES workflows(id) ON DELETE SET NULL,
    user_id           UUID NOT NULL,
    title             TEXT NOT NULL,
    dashboard_config  JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboards_execution_id ON dashboards(execution_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_workflow_id ON dashboards(workflow_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_at ON dashboards(created_at DESC);

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboards_select_own" ON dashboards;
CREATE POLICY "dashboards_select_own" ON dashboards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dashboards_insert_own" ON dashboards;
CREATE POLICY "dashboards_insert_own" ON dashboards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dashboards_delete_own" ON dashboards;
CREATE POLICY "dashboards_delete_own" ON dashboards
    FOR DELETE USING (auth.uid() = user_id);
