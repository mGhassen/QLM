-- RLS policies
-- SELECT: Users can read own conversations, public conversations, or shared conversations
create policy "conversations_read" on public.conversations for select
  to authenticated using (
    -- Own conversations
    created_by = auth.uid() OR
    -- Public conversations
    is_public = true OR
    -- Shared conversations (via conversation_shares table)
    exists (
      select 1
      from public.conversation_shares cs
      where cs.conversation_id = conversations.id
        and (
          cs.user_id = auth.uid() OR
          cs.organization_id IN (
            select organization_id
            from public.organization_memberships
            where user_id = auth.uid()
          )
        )
    )
  );

-- Allow unauthenticated users to read public conversations
create policy "conversations_read_public" on public.conversations for select
  to anon using (is_public = true);

-- INSERT: Users can create conversations if they have permission on the organization
-- OR if remixing (remixed_from is set, which means source is public or shared)
create policy "conversations_write" on public.conversations for insert
  to authenticated with check (
    created_by = auth.uid() AND
    (
      exists (
        select 1
        from public.projects p
        where p.id = conversations.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::app_permissions)
          )
      ) OR
      -- Allow remix (remixed_from indicates this is a remix)
      remixed_from IS NOT NULL
    )
  );

-- UPDATE: Only owners can update their own conversations (shared conversations are read-only)
-- Note: Once a conversation is public, it cannot be made private again via direct update
-- Use a separate function if you need to unpublish
create policy "conversations_update" on public.conversations for update
  to authenticated using (
    -- Only the owner can update
    created_by = auth.uid() AND
    is_public = false AND
    exists (
      select 1
      from public.projects p
      where p.id = conversations.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::app_permissions)
        )
    )
  )
  with check (
    -- Only the owner can update
    created_by = auth.uid() AND
    is_public = false
  );

-- DELETE: Users can delete own conversations (not public ones)
create policy "conversations_delete" on public.conversations for delete
  to authenticated using (
    created_by = auth.uid() AND
    is_public = false AND
    exists (
      select 1
      from public.projects p
      where p.id = conversations.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::app_permissions)
        )
    )
  );

-- Trigger to set timestamps
create trigger set_conversations_timestamps
  before insert or update on public.conversations
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking
create trigger set_conversations_user_tracking
  before insert or update on public.conversations
  for each row execute function public.trigger_set_user_tracking();

