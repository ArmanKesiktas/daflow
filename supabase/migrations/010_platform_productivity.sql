-- Daflow platform productivity layer: schedules, connectors, publish links, dataset organization, validation helpers.

create table if not exists workflow_schedules (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  frequency text not null default 'daily',
  time_of_day text,
  timezone text not null default 'Europe/Istanbul',
  is_active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_execution_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publish_links (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('dashboard', 'report')),
  resource_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  allow_export boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists data_connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  name text not null,
  config_json jsonb not null default '{}',
  status text not null default 'idle',
  last_synced_file_id uuid,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dataset_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#0071E3',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dataset_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8E8E93',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dataset_tag_links (
  dataset_id uuid not null references uploaded_files(id) on delete cascade,
  tag_id uuid not null references dataset_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (dataset_id, tag_id)
);

alter table uploaded_files add column if not exists folder_id uuid references dataset_folders(id) on delete set null;

alter table workflow_templates add column if not exists favorite_count integer not null default 0;
alter table workflow_templates add column if not exists rating_average numeric not null default 0;

create table if not exists template_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

create table if not exists template_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

alter table workflow_schedules enable row level security;
alter table publish_links enable row level security;
alter table data_connectors enable row level security;
alter table dataset_folders enable row level security;
alter table dataset_tags enable row level security;
alter table dataset_tag_links enable row level security;
alter table template_favorites enable row level security;
alter table template_ratings enable row level security;

do $$ begin
  create policy workflow_schedules_owner on workflow_schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy publish_links_owner on publish_links for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy data_connectors_owner on data_connectors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dataset_folders_owner on dataset_folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dataset_tags_owner on dataset_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dataset_tag_links_owner on dataset_tag_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy template_favorites_owner on template_favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy template_ratings_owner on template_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
