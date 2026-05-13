-- Workflow sharing by recipient email.

CREATE TABLE IF NOT EXISTS workflow_shares (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id         UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    owner_id            UUID NOT NULL,
    owner_email         TEXT,
    shared_with_email   TEXT NOT NULL,
    shared_with_user_id UUID,
    permission          TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_shares_workflow_id ON workflow_shares(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_shares_email ON workflow_shares(lower(shared_with_email));
CREATE INDEX IF NOT EXISTS idx_workflow_shares_user_id ON workflow_shares(shared_with_user_id);

ALTER TABLE workflow_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_shares_recipient_select" ON workflow_shares;
CREATE POLICY "workflow_shares_recipient_select" ON workflow_shares
    FOR SELECT USING (
        owner_id = auth.uid()
        OR shared_with_user_id = auth.uid()
        OR lower(shared_with_email) = lower(auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS "workflow_shares_owner_insert" ON workflow_shares;
CREATE POLICY "workflow_shares_owner_insert" ON workflow_shares
    FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workflow_shares_owner_delete" ON workflow_shares;
CREATE POLICY "workflow_shares_owner_delete" ON workflow_shares
    FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "workflows_shared" ON workflows;
CREATE POLICY "workflows_shared" ON workflows
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflow_shares
            WHERE workflow_shares.workflow_id = workflows.id
              AND (
                  workflow_shares.shared_with_user_id = auth.uid()
                  OR lower(workflow_shares.shared_with_email) = lower(auth.jwt() ->> 'email')
              )
              AND (workflow_shares.expires_at IS NULL OR workflow_shares.expires_at > NOW())
        )
    );
