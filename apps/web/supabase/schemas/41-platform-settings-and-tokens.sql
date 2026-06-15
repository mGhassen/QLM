/*
 * -------------------------------------------------------
 * Section: Deployment settings, resources, user tokens
 *
 * Settings: a global catalog of deployment-level knobs + per-deployment
 * overrides. The catalog row can be global (node_id IS NULL) or scoped
 * to a specific node. When a new deployment_request is inserted, every
 * matching catalog row is auto-fanned into a per-deployment row via the
 * `create_deployment_settings()` trigger.
 *
 * Resources: per-account and global quota declarations (cpu / memory /
 * storage / custom types).
 *
 * User tokens: per-account API tokens with scopes and an expiry.
 * -------------------------------------------------------
 */

-- ---------------------------------------------------------------------------
-- deployment_settings_catalog — global / node-scoped settings templates.
-- ---------------------------------------------------------------------------

create table if not exists public.deployment_settings_catalog (
  id uuid primary key default extensions.uuid_generate_v4(),
  node_id uuid references public.node(id) on delete cascade,
  setting_name varchar(255) not null,
  setting_type varchar(50) not null default 'string',
  setting_category varchar(100) not null default 'general',
  default_value text,
  description text,
  validation_rules jsonb default '{}'::jsonb,
  is_required boolean default false,
  is_system_setting boolean default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint deployment_settings_catalog_node_setting_unique unique (node_id, setting_name)
);

comment on table public.deployment_settings_catalog is 'Global and node-scoped catalog of deployment settings; seeded by admins.';

create index if not exists deployment_settings_catalog_by_node_id
  on public.deployment_settings_catalog (node_id);

create index if not exists deployment_settings_catalog_by_name
  on public.deployment_settings_catalog (setting_name);

create index if not exists deployment_settings_catalog_by_category
  on public.deployment_settings_catalog (setting_category);

create trigger set_deployment_settings_catalog_timestamps
  before insert or update on public.deployment_settings_catalog
  for each row execute function public.trigger_set_timestamps();

create trigger set_deployment_settings_catalog_user_tracking
  before insert or update on public.deployment_settings_catalog
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- deployment_settings — per-deployment override, one row per (deployment,
-- catalog entry) pair. Populated by `create_deployment_settings()` trigger
-- (defined below) when a deployment_request is inserted.
-- ---------------------------------------------------------------------------

create table if not exists public.deployment_settings (
  id uuid primary key default extensions.uuid_generate_v4(),
  deployment_id uuid references public.deployment_request(id) on delete cascade,
  setting_catalog_id uuid references public.deployment_settings_catalog(id) on delete cascade,
  setting_value text,
  is_active boolean default true,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint deployment_settings_deployment_catalog_unique unique (deployment_id, setting_catalog_id)
);

comment on table public.deployment_settings is 'Per-deployment overrides of catalog settings; auto-fanned on deployment_request insert.';

create index if not exists deployment_settings_by_deployment_id
  on public.deployment_settings (deployment_id);

create index if not exists deployment_settings_by_catalog_id
  on public.deployment_settings (setting_catalog_id);

create index if not exists deployment_settings_by_active
  on public.deployment_settings (is_active);

create trigger set_deployment_settings_timestamps
  before insert or update on public.deployment_settings
  for each row execute function public.trigger_set_timestamps();

create trigger set_deployment_settings_user_tracking
  before insert or update on public.deployment_settings
  for each row execute function public.trigger_set_user_tracking();

-- Auto-fan catalog rows into per-deployment rows when a deployment is created.
-- Matches every catalog row with `node_id IS NULL` (global) or
-- `node_id = NEW.node_id` (node-specific). Ported from source 20251013.
create or replace function public.create_deployment_settings () returns trigger
set search_path = '' as $$
begin
  insert into public.deployment_settings (deployment_id, setting_catalog_id, setting_value, is_active)
  select
    NEW.id as deployment_id,
    sc.id as setting_catalog_id,
    sc.default_value as setting_value,
    true as is_active
  from public.deployment_settings_catalog sc
  where sc.node_id is null
     or sc.node_id = NEW.node_id
  on conflict (deployment_id, setting_catalog_id) do nothing;
  return NEW;
end;
$$ language plpgsql;

create trigger create_deployment_settings_on_deployment_request
  after insert on public.deployment_request
  for each row execute function public.create_deployment_settings();

-- ---------------------------------------------------------------------------
-- resources — per-account + global resource quota declarations.
-- ---------------------------------------------------------------------------

create table if not exists public.resources (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade,
  resource_type text not null,
  resource_unit text not null,
  resource_value numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.resources is 'Resource quota declarations (cpu / memory / storage / …); per-account when account_id is set, global otherwise.';

create unique index if not exists resources_unique_account_type
  on public.resources (account_id, resource_type)
  where account_id is not null;

create unique index if not exists resources_unique_global_type
  on public.resources (resource_type)
  where account_id is null;

create index if not exists resources_by_account_id
  on public.resources (account_id);

create trigger set_resources_timestamps
  before insert or update on public.resources
  for each row execute function public.trigger_set_timestamps();

create trigger set_resources_user_tracking
  before insert or update on public.resources
  for each row execute function public.trigger_set_user_tracking();

-- ---------------------------------------------------------------------------
-- user_tokens — per-account API tokens with scopes + expiry.
-- ---------------------------------------------------------------------------

create table if not exists public.user_tokens (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token_name varchar(255) not null,
  scopes jsonb not null,
  expires_at bigint not null,
  revoked boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.user_tokens is 'API tokens scoped to a personal account; scopes + expiry + revocation state.';

create index if not exists user_tokens_by_account_id
  on public.user_tokens (account_id);

create trigger set_user_tokens_timestamps
  before insert or update on public.user_tokens
  for each row execute function public.trigger_set_timestamps();

create trigger set_user_tokens_user_tracking
  before insert or update on public.user_tokens
  for each row execute function public.trigger_set_user_tracking();
