/*
 * -------------------------------------------------------
 * Section: Performance profiles
 * Declarative CPU/memory/config specs that compute instances pin to.
 * Rows with `account_id IS NULL` are the public catalog (seeded); rows
 * with an account_id belong to that account's private catalog.
 * -------------------------------------------------------
 */

create or replace function public.generate_profile_key () returns text
set search_path = '' as $$
begin
  return 'pk_' || floor(random() * 1000000)::int;
end;
$$ language plpgsql;

create table if not exists public.performance_profile (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade,
  label_name varchar(255) not null unique,
  description_text text,
  database_provider varchar(255) not null,
  database_version varchar(50) not null,
  min_cpu int not null default 100,
  min_memory int not null default 128,
  config_flags jsonb,
  is_default boolean not null default false,
  is_active boolean not null default false,
  is_seed boolean not null default false,
  profile_key text unique,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.performance_profile is 'CPU / memory / config presets that compute instances pin to. Public-catalog rows have account_id = NULL; private rows scope to an account.';

-- Public-catalog rows: one row per id, no account_id.
create unique index if not exists unique_public_performance_profile
  on public.performance_profile (id)
  where account_id is null;

-- Per-account rows: scoped unique by (account_id, id).
create unique index if not exists unique_account_performance_profile
  on public.performance_profile (account_id, id)
  where account_id is not null;

-- Audit triggers.
create trigger set_performance_profile_timestamps
  before insert or update on public.performance_profile
  for each row execute function public.trigger_set_timestamps();

create trigger set_performance_profile_user_tracking
  before insert or update on public.performance_profile
  for each row execute function public.trigger_set_user_tracking();

-- Note: the source also ships `create_performance_profiles(account_id, variant_id)`
-- which reads from a `plan_entitlements` table that does not exist in this
-- repo. That helper is intentionally not ported in Stage 1 — re-introduce
-- when / if the entitlement machinery lands.
