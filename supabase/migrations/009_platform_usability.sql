-- Platform usability layer: dataset profiles, workflow versions, templates,
-- onboarding state, and future workspace/comment hooks.

CREATE TABLE IF NOT EXISTS dataset_profiles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id          UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    inferred_columns JSONB NOT NULL DEFAULT '[]',
    row_count        INTEGER NOT NULL DEFAULT 0,
    missing_summary  JSONB NOT NULL DEFAULT '{}',
    sample_preview   JSONB NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dataset_profiles_file_id ON dataset_profiles(file_id);
CREATE INDEX IF NOT EXISTS idx_dataset_profiles_user_id ON dataset_profiles(user_id);

CREATE TABLE IF NOT EXISTS workflow_versions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id    UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    name           TEXT NOT NULL,
    graph_data     JSONB NOT NULL DEFAULT '{}',
    version_number INTEGER NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_versions_unique_number ON workflow_versions(workflow_id, version_number);

CREATE TABLE IF NOT EXISTS workflow_templates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id         UUID,
    category         TEXT NOT NULL DEFAULT 'General',
    title            TEXT NOT NULL,
    description      TEXT,
    graph_data       JSONB NOT NULL DEFAULT '{}',
    required_columns JSONB NOT NULL DEFAULT '[]',
    is_public        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner_id ON workflow_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public);

CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id         UUID PRIMARY KEY,
    completed_steps JSONB NOT NULL DEFAULT '[]',
    skipped         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dataset_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dataset_profiles_own" ON dataset_profiles;
CREATE POLICY "dataset_profiles_own" ON dataset_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workflow_versions_own" ON workflow_versions;
CREATE POLICY "workflow_versions_own" ON workflow_versions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workflow_templates_select" ON workflow_templates;
CREATE POLICY "workflow_templates_select" ON workflow_templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "workflow_templates_owner_write" ON workflow_templates;
CREATE POLICY "workflow_templates_owner_write" ON workflow_templates
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "user_onboarding_own" ON user_onboarding;
CREATE POLICY "user_onboarding_own" ON user_onboarding
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workflow_comments_own" ON workflow_comments;
CREATE POLICY "workflow_comments_own" ON workflow_comments
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
