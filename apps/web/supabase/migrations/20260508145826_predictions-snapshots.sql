-- Predictions (RFC 0030 — phase 1)
-- Three append-only tables backing the @guepard/app-predictions UI:
--   public.prediction_schema_snapshots — versioned per datasource
--   public.prediction_agent_conversations — chat sessions pinned to a snapshot
--   public.prediction_agent_messages     — append-only chat history
-- Mirrors apps/web/supabase/schemas/51-prediction-snapshots.sql

create table if not exists public.prediction_schema_snapshots (
  id uuid primary key default extensions.uuid_generate_v4(),
  datasource_id uuid not null references public.datasources(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  metadata jsonb not null,
  taken_by uuid not null references auth.users(id),
  taken_at timestamptz not null default now(),
  unique (datasource_id, version)
);

create index if not exists ix_prediction_schema_snapshots_datasource
  on public.prediction_schema_snapshots (datasource_id, version desc);

create index if not exists ix_prediction_schema_snapshots_project
  on public.prediction_schema_snapshots (project_id);

alter table public.prediction_schema_snapshots enable row level security;
revoke all on public.prediction_schema_snapshots from authenticated, service_role;
grant select, insert on public.prediction_schema_snapshots to authenticated;

create policy "prediction_snapshots_read"
  on public.prediction_schema_snapshots for select
  to authenticated using (
    public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create policy "prediction_snapshots_write"
  on public.prediction_schema_snapshots for insert
  to authenticated with check (
    taken_by = auth.uid()
    and public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create table if not exists public.prediction_agent_conversations (
  id uuid primary key default extensions.uuid_generate_v4(),
  snapshot_id uuid not null references public.prediction_schema_snapshots(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_prediction_agent_conversations_snapshot
  on public.prediction_agent_conversations (snapshot_id);

create index if not exists ix_prediction_agent_conversations_project
  on public.prediction_agent_conversations (project_id);

alter table public.prediction_agent_conversations enable row level security;
revoke all on public.prediction_agent_conversations from authenticated, service_role;
grant select, insert, update on public.prediction_agent_conversations to authenticated;

create policy "prediction_agent_conversations_read"
  on public.prediction_agent_conversations for select
  to authenticated using (
    public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create policy "prediction_agent_conversations_write"
  on public.prediction_agent_conversations for insert
  to authenticated with check (
    created_by = auth.uid()
    and public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create policy "prediction_agent_conversations_update_own"
  on public.prediction_agent_conversations for update
  to authenticated using ( created_by = auth.uid() )
  with check ( created_by = auth.uid() );

create table if not exists public.prediction_agent_messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  conversation_id uuid not null references public.prediction_agent_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ix_prediction_agent_messages_conversation
  on public.prediction_agent_messages (conversation_id, created_at);

alter table public.prediction_agent_messages enable row level security;
revoke all on public.prediction_agent_messages from authenticated, service_role;
grant select, insert on public.prediction_agent_messages to authenticated;

create policy "prediction_agent_messages_read"
  on public.prediction_agent_messages for select
  to authenticated using (
    exists (
      select 1
      from public.prediction_agent_conversations c
      where c.id = conversation_id
        and public.has_role_on_organization(
          (select organization_id from public.projects where id = c.project_id)
        )
    )
  );

create policy "prediction_agent_messages_write"
  on public.prediction_agent_messages for insert
  to authenticated with check (
    exists (
      select 1
      from public.prediction_agent_conversations c
      where c.id = conversation_id
        and c.created_by = auth.uid()
    )
  );
