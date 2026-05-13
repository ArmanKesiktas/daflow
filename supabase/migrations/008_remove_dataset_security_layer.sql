-- Remove the old dataset/dashboard/report security layer.
-- Workflow sharing remains active through workflow_shares.

DROP POLICY IF EXISTS "files_shared" ON uploaded_files;
DROP POLICY IF EXISTS "executions_shared" ON workflow_executions;

DROP TABLE IF EXISTS dataset_access_logs CASCADE;
DROP TABLE IF EXISTS dataset_shares CASCADE;
DROP TABLE IF EXISTS content_shares CASCADE;
DROP TABLE IF EXISTS execution_shares CASCADE;

ALTER TABLE uploaded_files DROP COLUMN IF EXISTS encrypted;
ALTER TABLE uploaded_files DROP COLUMN IF EXISTS encryption_algorithm;
ALTER TABLE uploaded_files DROP COLUMN IF EXISTS owner_email;
