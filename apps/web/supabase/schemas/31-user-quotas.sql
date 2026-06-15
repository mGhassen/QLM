/*
 * -------------------------------------------------------
 * Section: User Quotas
 * User quotas define hard limits for credit allocation at the user level.
 * Credits allocated to a user cannot exceed the quota limit.
 * -------------------------------------------------------
 */

-- User Quotas table (Hard Limits)
create table if not exists public.user_quotas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  
  -- Quota limits
  credits_allocated integer not null default 0,
  credits_used integer not null default 0,
  credits_remaining integer generated always as (credits_allocated - credits_used) stored,
  
  -- Hard limit enforcement
  is_active boolean default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(organization_id, user_id)
);

comment on table public.user_quotas is 'Hard limits for credit allocation at the user level';
comment on column public.user_quotas.credits_allocated is 'Total credits allocated to this user';
comment on column public.user_quotas.credits_used is 'Credits consumed by this user';
comment on column public.user_quotas.credits_remaining is 'Remaining credits (computed: allocated - used)';
comment on column public.user_quotas.is_active is 'Whether the quota is active and enforced';

-- Indexes
create index if not exists ix_user_quotas_org on public.user_quotas(organization_id);
create index if not exists ix_user_quotas_user on public.user_quotas(user_id);

-- RLS Policies
alter table public.user_quotas enable row level security;

create policy "user_quotas_read" 
on public.user_quotas for select
to authenticated using (
  user_id = (select auth.uid()) or
  public.has_role_on_organization(organization_id)
);

-- Grant permissions
grant select on table public.user_quotas to authenticated;
grant select, insert, update, delete on table public.user_quotas to service_role;

-- Trigger to set updated_at
create trigger set_user_quotas_timestamps
  before insert or update on public.user_quotas
  for each row execute function public.trigger_set_timestamps();

