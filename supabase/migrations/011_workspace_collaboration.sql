-- Daflow workspace/team collaboration layer.

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  owner_id uuid references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'analyst', 'viewer', 'guest')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'analyst', 'viewer', 'guest')),
  token text unique not null,
  invited_by uuid references auth.users(id),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists workspace_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists workspace_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references workspace_projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('file', 'workflow', 'dashboard', 'report', 'node')),
  entity_id uuid not null,
  node_id text,
  content text not null,
  created_by uuid references auth.users(id),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table uploaded_files add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table uploaded_files add column if not exists project_id uuid references workspace_projects(id) on delete set null;
alter table workflows add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table workflows add column if not exists project_id uuid references workspace_projects(id) on delete set null;
alter table workflow_executions add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table workflow_executions add column if not exists project_id uuid references workspace_projects(id) on delete set null;
alter table dashboards add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table dashboards add column if not exists project_id uuid references workspace_projects(id) on delete set null;
alter table reports add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table reports add column if not exists project_id uuid references workspace_projects(id) on delete set null;

create index if not exists idx_workspace_members_user on workspace_members(user_id, status);
create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id, status);
create index if not exists idx_workspace_projects_workspace on workspace_projects(workspace_id);
create index if not exists idx_workspace_activity_workspace_created on workspace_activity_logs(workspace_id, created_at desc);
create index if not exists idx_workspace_comments_entity on workspace_comments(workspace_id, entity_type, entity_id);
create index if not exists idx_uploaded_files_workspace on uploaded_files(workspace_id, created_at desc);
create index if not exists idx_workflows_workspace on workflows(workspace_id, updated_at desc);
create index if not exists idx_executions_workspace on workflow_executions(workspace_id, created_at desc);
create index if not exists idx_dashboards_workspace on dashboards(workspace_id, created_at desc);
create index if not exists idx_reports_workspace on reports(workspace_id, created_at desc);

create or replace function daflow_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function daflow_workspace_writer(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin', 'analyst')
  );
$$;

create or replace function daflow_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
  );
$$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;
alter table workspace_projects enable row level security;
alter table workspace_activity_logs enable row level security;
alter table workspace_comments enable row level security;

drop policy if exists workspaces_member_select on workspaces;
create policy workspaces_member_select on workspaces for select using (daflow_workspace_member(id));
drop policy if exists workspaces_owner_insert on workspaces;
create policy workspaces_owner_insert on workspaces for insert with check (auth.uid() = owner_id);
drop policy if exists workspaces_admin_update on workspaces;
create policy workspaces_admin_update on workspaces for update using (daflow_workspace_admin(id));
drop policy if exists workspaces_owner_delete on workspaces;
create policy workspaces_owner_delete on workspaces for delete using (auth.uid() = owner_id);

drop policy if exists workspace_members_select on workspace_members;
create policy workspace_members_select on workspace_members for select using (daflow_workspace_member(workspace_id));
drop policy if exists workspace_members_admin_write on workspace_members;
create policy workspace_members_admin_write on workspace_members for all using (daflow_workspace_admin(workspace_id)) with check (daflow_workspace_admin(workspace_id));

drop policy if exists workspace_projects_member_select on workspace_projects;
create policy workspace_projects_member_select on workspace_projects for select using (daflow_workspace_member(workspace_id));
drop policy if exists workspace_projects_writer_write on workspace_projects;
create policy workspace_projects_writer_write on workspace_projects for all using (daflow_workspace_writer(workspace_id)) with check (daflow_workspace_writer(workspace_id));

drop policy if exists workspace_activity_member_select on workspace_activity_logs;
create policy workspace_activity_member_select on workspace_activity_logs for select using (daflow_workspace_member(workspace_id));
drop policy if exists workspace_activity_writer_insert on workspace_activity_logs;
create policy workspace_activity_writer_insert on workspace_activity_logs for insert with check (daflow_workspace_member(workspace_id));

drop policy if exists workspace_comments_member_select on workspace_comments;
create policy workspace_comments_member_select on workspace_comments for select using (daflow_workspace_member(workspace_id));
drop policy if exists workspace_comments_member_insert on workspace_comments;
create policy workspace_comments_member_insert on workspace_comments for insert with check (daflow_workspace_member(workspace_id));
drop policy if exists workspace_comments_owner_update on workspace_comments;
create policy workspace_comments_owner_update on workspace_comments for update using (created_by = auth.uid() or daflow_workspace_admin(workspace_id));
drop policy if exists workspace_comments_owner_delete on workspace_comments;
create policy workspace_comments_owner_delete on workspace_comments for delete using (created_by = auth.uid() or daflow_workspace_admin(workspace_id));

-- Workspace-aware RLS policies for existing resources. Old owner policies remain
-- in place for compatibility; these policies add team access.
drop policy if exists files_workspace_select on uploaded_files;
create policy files_workspace_select on uploaded_files for select using (workspace_id is not null and daflow_workspace_member(workspace_id));
drop policy if exists files_workspace_insert on uploaded_files;
create policy files_workspace_insert on uploaded_files for insert with check (workspace_id is null or daflow_workspace_writer(workspace_id));
drop policy if exists files_workspace_update on uploaded_files;
create policy files_workspace_update on uploaded_files for update using (workspace_id is null or daflow_workspace_writer(workspace_id));
drop policy if exists files_workspace_delete on uploaded_files;
create policy files_workspace_delete on uploaded_files for delete using (workspace_id is null or daflow_workspace_writer(workspace_id));

drop policy if exists workflows_workspace_select on workflows;
create policy workflows_workspace_select on workflows for select using (workspace_id is not null and daflow_workspace_member(workspace_id));
drop policy if exists workflows_workspace_insert on workflows;
create policy workflows_workspace_insert on workflows for insert with check (workspace_id is null or daflow_workspace_writer(workspace_id));
drop policy if exists workflows_workspace_update on workflows;
create policy workflows_workspace_update on workflows for update using (workspace_id is null or daflow_workspace_writer(workspace_id));
drop policy if exists workflows_workspace_delete on workflows;
create policy workflows_workspace_delete on workflows for delete using (workspace_id is null or daflow_workspace_writer(workspace_id));

drop policy if exists executions_workspace_select on workflow_executions;
create policy executions_workspace_select on workflow_executions for select using (workspace_id is not null and daflow_workspace_member(workspace_id));
drop policy if exists executions_workspace_insert on workflow_executions;
create policy executions_workspace_insert on workflow_executions for insert with check (workspace_id is null or daflow_workspace_writer(workspace_id));

drop policy if exists dashboards_workspace_select on dashboards;
create policy dashboards_workspace_select on dashboards for select using (workspace_id is not null and daflow_workspace_member(workspace_id));
drop policy if exists dashboards_workspace_insert on dashboards;
create policy dashboards_workspace_insert on dashboards for insert with check (workspace_id is null or daflow_workspace_writer(workspace_id));

drop policy if exists reports_workspace_select on reports;
create policy reports_workspace_select on reports for select using (workspace_id is not null and daflow_workspace_member(workspace_id));
drop policy if exists reports_workspace_insert on reports;
create policy reports_workspace_insert on reports for insert with check (workspace_id is null or daflow_workspace_writer(workspace_id));

-- Best-effort personal workspace backfill for existing data. Service role will
-- normally run this migration, so auth.uid() is not needed here.
insert into workspaces (id, name, slug, description, owner_id, created_at, updated_at)
select gen_random_uuid(), 'Personal Workspace', 'personal-' || left(user_id::text, 8), 'Automatically created personal workspace.', user_id, now(), now()
from (
  select user_id from uploaded_files where workspace_id is null
  union
  select user_id from workflows where workspace_id is null
  union
  select user_id from reports where workspace_id is null
  union
  select user_id from dashboards where workspace_id is null
) users
where not exists (select 1 from workspaces w where w.owner_id = users.user_id and w.slug = 'personal-' || left(users.user_id::text, 8));

insert into workspace_members (workspace_id, user_id, role, status)
select w.id, w.owner_id, 'owner', 'active'
from workspaces w
where w.owner_id is not null
on conflict (workspace_id, user_id) do nothing;

update uploaded_files f set workspace_id = w.id
from workspaces w
where f.workspace_id is null and w.owner_id = f.user_id and w.slug = 'personal-' || left(f.user_id::text, 8);

update workflows f set workspace_id = w.id
from workspaces w
where f.workspace_id is null and w.owner_id = f.user_id and w.slug = 'personal-' || left(f.user_id::text, 8);

update workflow_executions e set workspace_id = w.workspace_id, project_id = w.project_id
from workflows w
where e.workspace_id is null and e.workflow_id = w.id;

update dashboards d set workspace_id = w.workspace_id, project_id = w.project_id
from workflows w
where d.workspace_id is null and d.workflow_id = w.id;

update reports r set workspace_id = w.workspace_id, project_id = w.project_id
from workflows w
where r.workspace_id is null and r.workflow_id = w.id;
