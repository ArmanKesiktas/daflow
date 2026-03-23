-- ============================================================
-- Migration 002: Row Level Security Policies
-- ============================================================

-- ─── Workflows ───────────────────────────────────────────────
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflows_select_own" ON workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workflows_insert_own" ON workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflows_update_own" ON workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workflows_delete_own" ON workflows
    FOR DELETE USING (auth.uid() = user_id);

-- ─── Executions ──────────────────────────────────────────────
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "executions_select_own" ON workflow_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "executions_insert_own" ON workflow_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "executions_update_own" ON workflow_executions
    FOR UPDATE USING (auth.uid() = user_id);

-- ─── Node Results ─────────────────────────────────────────────
ALTER TABLE node_execution_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "node_results_own" ON node_execution_results
    FOR ALL USING (
        execution_id IN (
            SELECT id FROM workflow_executions WHERE user_id = auth.uid()
        )
    );

-- ─── Reports ─────────────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports_insert_own" ON reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_delete_own" ON reports
    FOR DELETE USING (auth.uid() = user_id);

-- ─── Uploaded Files ───────────────────────────────────────────
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_own" ON uploaded_files
    FOR ALL USING (auth.uid() = user_id);
