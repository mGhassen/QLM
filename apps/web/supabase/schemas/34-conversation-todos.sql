/**
 * -------------------------------------------------------
 * Section: Todos
 * AI-generated todo items per conversation. One row per conversation;
 * items stored as JSONB array of {id, content, status, priority}.
 * -------------------------------------------------------
 */

create table if not exists
  public.todos (
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    items jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default current_timestamp,
    primary key (conversation_id)
  );

comment on table public.todos is 'AI-generated todo items per conversation; items is array of {id, content, status, priority}';

comment on column public.todos.conversation_id is 'The conversation these todos belong to';

comment on column public.todos.items is 'JSONB array of todo items: id, content, status, priority';

comment on column public.todos.updated_at is 'Last time the todos were updated';

-- Revoke all access to todos table for authenticated users and service_role
revoke all on public.todos
from
  authenticated,
  service_role;

-- Open up access to todos table for authenticated users and service_role
grant
select
  ,
  insert,
  update,
  delete on table public.todos to authenticated;

grant
select
  ,
  insert,
  update,
  delete on table public.todos to service_role;

-- Indexes
-- Index on the todos table for lookup by conversation
create index ix_todos_conversation_id on public.todos (conversation_id);

-- RLS
alter table public.todos enable row level security;

-- SELECT(todos):
-- Users can read todos for conversations they own, that are public, or that are shared with them
create policy todos_read_self on public.todos for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.conversations c
      where
        c.id = todos.conversation_id
        and (
          c.created_by = auth.uid()
          or c.is_public = true
          or exists (
            select
              1
            from
              public.conversation_shares cs
            where
              cs.conversation_id = c.id
              and (
                cs.user_id = auth.uid()
                or cs.organization_id in (
                  select
                    organization_id
                  from
                    public.organization_memberships
                  where
                    user_id = auth.uid()
                )
              )
          )
        )
    )
  );

-- INSERT/UPDATE/DELETE(todos):
-- Only the conversation owner can create or modify todos for that conversation
create policy todos_write_self on public.todos for all
  to authenticated using (public.is_conversation_owner (conversation_id))
  with
    check (public.is_conversation_owner (conversation_id));
