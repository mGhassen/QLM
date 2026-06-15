-- RLS policies
-- SELECT: Users can read messages in own conversations, public conversations, or shared conversations
create policy "messages_read" on public.messages for select
  to authenticated using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          -- Own conversation
          c.created_by = auth.uid() OR
          -- Public conversation
          c.is_public = true OR
          -- Shared conversation (via conversation_shares)
          exists (
            select 1
            from public.conversation_shares cs
            where cs.conversation_id = c.id
              and (
                cs.user_id = auth.uid() OR
                cs.organization_id IN (
                  select organization_id
                  from public.organization_memberships
                  where user_id = auth.uid()
                )
              )
          )
        )
    )
  );

-- Allow unauthenticated users to read messages in public conversations
create policy "messages_read_public" on public.messages for select
  to anon using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.is_public = true
    )
  );

-- INSERT: Only conversation owners can create messages (shared conversations are read-only)
create policy "messages_write" on public.messages for insert
  to authenticated with check (
    created_by = auth.uid() AND
    exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        -- Only the conversation owner can add messages
        and c.created_by = auth.uid()
        and c.is_public = false
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  );

-- UPDATE: Only conversation owners can update messages (shared conversations are read-only)
create policy "messages_update" on public.messages for update
  to authenticated using (
    role = 'user'
    and exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        -- Only the conversation owner can update messages
        and c.created_by = auth.uid()
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  )
  with check (
    role = 'user'
    and exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        -- Only the conversation owner can update messages
        and c.created_by = auth.uid()
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  );

-- UPDATE: Allow updating assistant messages for feedback (metadata updates)
create policy "messages_update_assistant_feedback" on public.messages for update
  to authenticated using (
    role = 'assistant'
    and exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        and c.created_by = auth.uid()
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  )
  with check (
    role = 'assistant'
    and exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        and c.created_by = auth.uid()
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  );

-- DELETE: Only conversation owners can delete messages (shared conversations are read-only)
create policy "messages_delete" on public.messages for delete
  to authenticated using (
    role = 'user'
    and exists (
      select 1
      from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id
        -- Only the conversation owner can delete messages
        and c.created_by = auth.uid()
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::app_permissions)
        )
    )
  );

-- Trigger to set timestamps
create trigger set_messages_timestamps
  before insert or update on public.messages
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking
create trigger set_messages_user_tracking
  before insert or update on public.messages
  for each row execute function public.trigger_set_user_tracking();

