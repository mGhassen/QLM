/*
 * -------------------------------------------------------
 * Section: Usage
 * Usage tracking table for time-series data on API usage, tokens, and resources.
 * -------------------------------------------------------
 */

-- Usage table (time series data)
create table if not exists public.usage (
  id uuid unique not null default extensions.uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  reasoning_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  context_size integer not null default 0,
  credits_cap integer not null default 0,
  credits_used integer not null default 0,
  cost numeric not null default 0,
  cpu real not null default 0,
  memory real not null default 0,
  network real not null default 0,
  gpu real not null default 0,
  storage real not null default 0,
  created_at timestamp with time zone not null default current_timestamp,
  primary key (id)
);

comment on table public.usage is 'Usage tracking table for time-series data on API usage, tokens, and resources.';

comment on column public.usage.conversation_id is 'The conversation this usage record belongs to';
comment on column public.usage.project_id is 'The project this usage record belongs to';
comment on column public.usage.organization_id is 'The organization this usage record belongs to';
comment on column public.usage.user_id is 'The user this usage record belongs to';
comment on column public.usage.model is 'The model used';
comment on column public.usage.input_tokens is 'Number of input tokens';
comment on column public.usage.output_tokens is 'Number of output tokens';
comment on column public.usage.total_tokens is 'Total number of tokens';
comment on column public.usage.reasoning_tokens is 'Number of reasoning tokens';
comment on column public.usage.cached_input_tokens is 'Number of cached input tokens';
comment on column public.usage.context_size is 'Context size used';
comment on column public.usage.credits_cap is 'Credits capacity';
comment on column public.usage.credits_used is 'Credits used';
comment on column public.usage.cpu is 'CPU usage';
comment on column public.usage.memory is 'Memory usage';
comment on column public.usage.network is 'Network usage';
comment on column public.usage.gpu is 'GPU usage';
comment on column public.usage.storage is 'Storage usage';
comment on column public.usage.created_at is 'Timestamp of when the usage record was created';

-- Enable RLS on the usage table
alter table "public"."usage" enable row level security;

-- Revoke default permissions
revoke all on public.usage from authenticated, service_role;

-- Grant specific permissions
grant select, insert on table public.usage to authenticated;
grant select, insert on table public.usage to service_role;

-- Indexes
create index if not exists ix_usage_conversation_id on public.usage (conversation_id);
create index if not exists ix_usage_project_id on public.usage (project_id);
create index if not exists ix_usage_organization_id on public.usage (organization_id);
create index if not exists ix_usage_user_id on public.usage (user_id);
create index if not exists ix_usage_id on public.usage (id desc);
create index if not exists ix_usage_created_at on public.usage (created_at desc);

-- RLS policies
-- SELECT: Users can read usage if they have a role on the organization
-- OR if it's their own usage
create policy "usage_read" on public.usage for select
  to authenticated using (
    user_id = (select auth.uid()) or
    public.has_role_on_organization(organization_id)
  );

-- INSERT: Users can create their own usage records OR if they have a role on the organization
-- Simplified to use organization_id directly to avoid RLS recursion from reading conversations/projects
create policy "usage_write" on public.usage for insert
  to authenticated with check (
    user_id = (select auth.uid()) or
    public.has_role_on_organization(organization_id)
  );

-- Also allow service_role to insert (for system operations)
create policy "usage_write_service" on public.usage for insert
  to service_role with check (true);
