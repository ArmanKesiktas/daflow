create extension if not exists "uuid-ossp";

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text default 'tr' check (language in ('tr', 'en')),
  theme text default 'dark' check (theme in ('dark', 'light')),
  notification_settings jsonb default '{"workspace": true, "comments": true, "roles": true}'::jsonb,
  completed_tours jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table user_onboarding add column if not exists updated_at timestamptz default now();
alter table user_onboarding alter column completed_steps set default '[]'::jsonb;

create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);
create index if not exists idx_notifications_workspace on notifications(workspace_id);

alter table user_preferences enable row level security;
alter table notifications enable row level security;

drop policy if exists user_preferences_own_select on user_preferences;
create policy user_preferences_own_select on user_preferences for select using (auth.uid() = user_id);
drop policy if exists user_preferences_own_insert on user_preferences;
create policy user_preferences_own_insert on user_preferences for insert with check (auth.uid() = user_id);
drop policy if exists user_preferences_own_update on user_preferences;
create policy user_preferences_own_update on user_preferences for update using (auth.uid() = user_id);

drop policy if exists notifications_own_select on notifications;
create policy notifications_own_select on notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_own_update on notifications;
create policy notifications_own_update on notifications for update using (auth.uid() = user_id);
drop policy if exists notifications_own_insert on notifications;
create policy notifications_own_insert on notifications for insert with check (auth.uid() = user_id);
