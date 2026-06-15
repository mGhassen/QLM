-- RLS policies for notebook_shares
-- SELECT: Users can see shares for notebooks they own or that are shared with them
create policy "notebook_shares_read" on public.notebook_shares for select
  to authenticated using (
    -- Notebook owner can see all shares (using security definer function to avoid recursion)
    public.is_notebook_owner(notebook_shares.notebook_id) OR
    -- User can see shares that include them
    (user_id = auth.uid()) OR
    (organization_id IN (
      select id from public.organizations
      where user_id = auth.uid()
        or exists (
          select 1 from public.organization_memberships
          where organization_id = notebook_shares.organization_id
            and user_id = auth.uid()
        )
    ))
  );

-- INSERT: Users can create shares for notebooks they own
create policy "notebook_shares_write" on public.notebook_shares for insert
  to authenticated with check (
    public.is_notebook_owner(notebook_shares.notebook_id) AND
    public.has_permission(auth.uid(), (
      select p.organization_id
      from public.projects p
      join public.notebooks n on n.project_id = p.id
      where n.id = notebook_shares.notebook_id
    ), 'notebooks.share'::app_permissions)
  );

-- DELETE: Users can delete shares for notebooks they own
create policy "notebook_shares_delete" on public.notebook_shares for delete
  to authenticated using (
    public.is_notebook_owner(notebook_shares.notebook_id)
  );

-- RLS policies for conversation_shares
-- SELECT: Users can see shares for conversations they own or that are shared with them
create policy "conversation_shares_read" on public.conversation_shares for select
  to authenticated using (
    -- Conversation owner can see all shares (using security definer function to avoid recursion)
    public.is_conversation_owner(conversation_shares.conversation_id) OR
    -- User can see shares that include them
    (user_id = auth.uid()) OR
    (organization_id IN (
      select id from public.organizations
      where user_id = auth.uid()
        or exists (
          select 1 from public.organization_memberships
          where organization_id = conversation_shares.organization_id
            and user_id = auth.uid()
        )
    ))
  );

-- INSERT: Users can create shares for conversations they own
create policy "conversation_shares_write" on public.conversation_shares for insert
  to authenticated with check (
    public.is_conversation_owner(conversation_shares.conversation_id) AND
    public.has_permission(auth.uid(), (
      select p.organization_id
      from public.projects p
      join public.conversations c on c.project_id = p.id
      where c.id = conversation_shares.conversation_id
    ), 'conversations.share'::app_permissions)
  );

-- DELETE: Users can delete shares for conversations they own
create policy "conversation_shares_delete" on public.conversation_shares for delete
  to authenticated using (
    public.is_conversation_owner(conversation_shares.conversation_id)
  );

