/*
 * -------------------------------------------------------
 * Section: Deployments, snapshots, clones, branches, compute, db roles
 *
 * Ported from guepard-console's guepard.gp_* tables. The hierarchy:
 *
 *   db_role  ─────────────────────────┐
 *                                     ▼
 *   node ─►  deployment_request  ───►  data_snapshot  ───►  data_clone
 *                   │                  (snapshot_db_roles_id jsonb)      ▲
 *                   │                                                     │
 *                   └───►  branch  (FK to snapshot) ──────────────────────┘
 *                   │
 *                   └───►  compute  (FK to branch + performance_profile)
 *
 * Stage 1 keeps source RLS verbatim (most are missing; source's user-scoped
 * policies on clone/snapshot/deployment_request are preserved). Stage 2
 * (file 42) rewrites every policy against `is_account_owner(account_id)`.
 * -------------------------------------------------------
 */

-- ---------------------------------------------------------------------------
-- db_role — database users/roles. Originally had FK to deployment_request,
-- but the source reversed the relationship (deployment_request.db_user_id FK
-- into db_role) in 20250701, so this table is now standalone.
-- ---------------------------------------------------------------------------

create table if not exists public.db_role (
  id uuid primary key default extensions.uuid_generate_v4(),
  username varchar(255) not null,
  password varchar(255) not null,
  password_validity timestamp with time zone null,
  privileges jsonb not null default '[]'::jsonb,
  status varchar(20) not null default 'INIT' check (
    status in ('INIT', 'CREATED', 'ACTIVE', 'REVOKED', 'DELETED', 'ERROR')
  ),
  superuser boolean not null default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.db_role is 'Database-level users/roles created for deployments (username, password, privileges, superuser flag).';

create trigger set_db_role_timestamps
  before insert or update on public.db_role
  for each row execute function public.trigger_set_timestamps();

create trigger set_db_role_user_tracking
  before insert or update on public.db_role
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- deployment_request — the central table. Everything else in this file
-- references it via `deployment_id`.
-- ---------------------------------------------------------------------------

create table if not exists public.deployment_request (
  id uuid primary key default extensions.uuid_generate_v4(),
  name varchar(255) not null unique,
  status varchar(255) not null default 'INIT' check (
    status in ('INIT', 'PENDING', 'IN_PROGRESS', 'CREATED', 'ERROR', 'DELETED')
  ),
  account_id uuid not null references public.accounts(id) on delete cascade,
  clone_id uuid,
  snapshot_id uuid,
  snapshot_parent uuid,
  pipeline_id uuid,
  current_clone uuid,
  deployment_parent uuid,
  deployment_type varchar(255) not null default 'REPOSITORY' check (
    deployment_type in ('REPOSITORY', 'SHADOW', 'F2')
  ),
  repository_name varchar(255) not null,
  fqdn varchar(255) not null unique,
  database_provider varchar(255) not null,
  database_version varchar(50) not null default 'latest',
  database_username varchar(50),
  database_password varchar(50),
  node_id uuid references public.node(id) on delete set null,
  port int unique,
  db_user_id uuid references public.db_role(id),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.deployment_request is 'A request to deploy a database. Owns a port, pins to a node, optionally references a db_role superuser.';

-- Random-port trigger: auto-assign an unused port in [20000, 32000] if one
-- isn't supplied. Ported from source migration 20250521150517.
create or replace function public.generate_random_port () returns integer
set search_path = '' as $$
declare
  new_port integer;
  port_exists boolean;
begin
  loop
    new_port := floor(random() * (32000 - 20000 + 1) + 20000)::integer;
    select exists (
      select 1 from public.deployment_request where port = new_port
    ) into port_exists;
    exit when not port_exists;
  end loop;
  return new_port;
end;
$$ language plpgsql;

create or replace function public.set_deployment_random_port () returns trigger
set search_path = '' as $$
begin
  if NEW.port is null then
    NEW.port := public.generate_random_port();
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger set_deployment_random_port_trigger
  before insert on public.deployment_request
  for each row execute function public.set_deployment_random_port();

create trigger set_deployment_request_timestamps
  before insert or update on public.deployment_request
  for each row execute function public.trigger_set_timestamps();

create trigger set_deployment_request_user_tracking
  before insert or update on public.deployment_request
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- data_snapshot — a frozen DB state. Created manually or automatically by
-- deployments. Can hold references to db_role ids via snapshot_db_roles_id.
-- ---------------------------------------------------------------------------

create table if not exists public.data_snapshot (
  id uuid primary key default extensions.uuid_generate_v4(),
  name varchar(8) generated always as (substring(id::text, 1, 8)) stored,
  status varchar(255) not null default 'INIT' check (
    status in ('INIT', 'PENDING', 'IN_PROGRESS', 'CREATED', 'ERROR')
  ),
  snapshot_type varchar(255) not null default 'MANUAL' check (
    snapshot_type in ('MANUAL', 'AUTO', 'INIT')
  ),
  snapshot_comment varchar(255),
  snapshot_schema json,
  snapshot_db_roles_id jsonb,
  account_id uuid not null references public.accounts(id) on delete cascade,
  dataset_id uuid,
  deployment_id uuid references public.deployment_request(id) on delete set null,
  parent_id uuid,
  is_ephemeral boolean default false,
  is_golden boolean not null default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint data_snapshot_unique_name_dataset unique (name, dataset_id)
);

comment on table public.data_snapshot is 'A frozen DB state for a deployment; cloning starts from here.';

create trigger set_data_snapshot_timestamps
  before insert or update on public.data_snapshot
  for each row execute function public.trigger_set_timestamps();

create trigger set_data_snapshot_user_tracking
  before insert or update on public.data_snapshot
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- data_clone — a clone of a snapshot with its own compute. (Source defines
-- the status check before performance_profile_id was added; unified here.)
-- ---------------------------------------------------------------------------

create table if not exists public.data_clone (
  id uuid primary key default extensions.uuid_generate_v4(),
  name varchar(255) not null unique,
  branch_name varchar(255),
  status varchar(255) not null default 'INIT' check (
    status in ('INIT', 'PENDING', 'IN_PROGRESS', 'CREATED', 'ERROR')
  ),
  account_id uuid not null references public.accounts(id) on delete cascade,
  snapshot_id uuid references public.data_snapshot(id),
  deployment_id uuid,
  environment_type varchar(255) check (
    environment_type in ('File', 'Database', 'Server')
  ),
  database_provider varchar(255),
  database_version varchar(50) not null default 'latest',
  database_username varchar(50),
  database_password varchar(50),
  is_ephemeral boolean default false,
  is_masked boolean default false,
  is_purged boolean default false,
  performance_profile_id uuid references public.performance_profile(id) on delete set null on update cascade,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.data_clone is 'A clone of a snapshot; runs as its own compute instance with an optional performance profile.';

create trigger set_data_clone_timestamps
  before insert or update on public.data_clone
  for each row execute function public.trigger_set_timestamps();

create trigger set_data_clone_user_tracking
  before insert or update on public.data_clone
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- branch — git-like branch pointing at a snapshot, scoped to a deployment.
-- The source dropped the performance_profile_id FK in 20250630; not present
-- here.
-- ---------------------------------------------------------------------------

create table if not exists public.branch (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  deployment_id uuid references public.deployment_request(id),
  label_name varchar(255) not null unique,
  branch_name varchar(255),
  snapshot_id uuid references public.data_snapshot(id),
  job_status public.job_status not null default 'INIT',
  is_ephemeral boolean default false,
  is_masked boolean default false,
  is_purged boolean default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.branch is 'Git-like branch; scoped to a deployment, points at a snapshot.';

create trigger set_branch_timestamps
  before insert or update on public.branch
  for each row execute function public.trigger_set_timestamps();

create trigger set_branch_user_tracking
  before insert or update on public.branch
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- compute — running compute instance tied to a deployment + branch, pinned
-- to a performance profile.
-- ---------------------------------------------------------------------------

create table if not exists public.compute (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  label_name varchar(255) not null unique,
  job_status public.job_status not null default 'INIT',
  compute_status public.compute_status,
  deployment_id uuid references public.deployment_request(id),
  branch_id uuid references public.branch(id),
  performance_profile_id uuid not null references public.performance_profile(id),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.compute is 'Running compute instance attached to a deployment + branch, pinned to a performance profile.';

create trigger set_compute_timestamps
  before insert or update on public.compute
  for each row execute function public.trigger_set_timestamps();

create trigger set_compute_user_tracking
  before insert or update on public.compute
  for each row execute function public.trigger_set_user_tracking();
