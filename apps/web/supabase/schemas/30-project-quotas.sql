/*
 * -------------------------------------------------------
 * Section: Project Quotas
 * Project quotas define hard limits for credit allocation at the project level.
 * Credits allocated to a project cannot exceed the quota limit.
 * -------------------------------------------------------
 */

-- Project Quotas table (Hard Limits)
create table if not exists public.project_quotas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  
  -- Quota limits
  credits_allocated integer not null default 0, -- Total credits allocated to this project
  credits_used integer not null default 0, -- Credits consumed by this project
  credits_remaining integer generated always as (credits_allocated - credits_used) stored,
  
  -- Hard limit enforcement
  is_active boolean default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(project_id)
);

comment on table public.project_quotas is 'Hard limits for credit allocation at the project level';
comment on column public.project_quotas.credits_allocated is 'Total credits allocated to this project';
comment on column public.project_quotas.credits_used is 'Credits consumed by this project';
comment on column public.project_quotas.credits_remaining is 'Remaining credits (computed: allocated - used)';
comment on column public.project_quotas.is_active is 'Whether the quota is active and enforced';

-- Indexes
create index if not exists ix_project_quotas_org on public.project_quotas(organization_id);
create index if not exists ix_project_quotas_project on public.project_quotas(project_id);

-- RLS Policies
alter table public.project_quotas enable row level security;

create policy "project_quotas_read" 
on public.project_quotas for select
to authenticated using (
  public.has_role_on_organization(organization_id)
);

-- Grant permissions
grant select on table public.project_quotas to authenticated;
grant select, insert, update, delete on table public.project_quotas to service_role;

-- Trigger to set updated_at
create trigger set_project_quotas_timestamps
  before insert or update on public.project_quotas
  for each row execute function public.trigger_set_timestamps();

