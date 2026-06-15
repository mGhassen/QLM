-- RLS policies for notebooks
-- SELECT: Users can read own notebooks, public notebooks, or shared notebooks
create policy "notebooks_read" on public.notebooks for select
  to authenticated using (
    -- Own notebooks
    created_by = auth.uid() OR
    -- Public notebooks
    is_public = true OR
    -- Shared notebooks (via notebook_shares table)
    exists (
      select 1
      from public.notebook_shares ns
      where ns.notebook_id = notebooks.id
        and (
          ns.user_id = auth.uid() OR
          ns.organization_id IN (
            select organization_id
            from public.organization_memberships
            where user_id = auth.uid()
          )
        )
    )
  );

-- Allow unauthenticated users to read public notebooks
create policy "notebooks_read_public" on public.notebooks for select
  to anon using (is_public = true);

-- INSERT: Users can create notebooks if they are the organization owner or have permission
-- OR if remixing (remixed_from is set, which means source is public or shared)
create policy "notebooks_write" on public.notebooks for insert
  to authenticated with check (
    created_by = auth.uid() AND
    (
      exists (
        select 1
        from public.projects p
        where p.id = notebooks.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::app_permissions)
          )
      ) OR
      -- Allow remix (remixed_from indicates this is a remix)
      remixed_from IS NOT NULL
    )
  );

-- UPDATE: Only owners can update their own notebooks (shared notebooks are read-only)
-- Note: Once a notebook is public, it cannot be made private again via direct update
-- Use a separate function if you need to unpublish
create policy "notebooks_update" on public.notebooks for update
  to authenticated using (
    -- Only the owner can update
    created_by = auth.uid() AND
    is_public = false AND
    exists (
      select 1
      from public.projects p
      where p.id = notebooks.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::app_permissions)
        )
    )
  )
  with check (
    -- Only the owner can update
    created_by = auth.uid() AND
    is_public = false
  );

-- DELETE: Users can delete own notebooks (not public ones)
create policy "notebooks_delete" on public.notebooks for delete
  to authenticated using (
    created_by = auth.uid() AND
    is_public = false AND
    exists (
      select 1
      from public.projects p
      where p.id = notebooks.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::app_permissions)
        )
    )
  );

-- RLS policies for notebook_versions
-- SELECT: Users can read notebook versions if they can read the notebook
create policy "notebook_versions_read" on public.notebook_versions for select
  to authenticated using (
    exists (
      select 1
      from public.notebooks n
      where n.id = notebook_versions.notebook_id
        and (
          -- Own notebooks
          n.created_by = auth.uid() OR
          -- Public notebooks
          n.is_public = true OR
          -- Shared notebooks (via notebook_shares)
          exists (
            select 1
            from public.notebook_shares ns
            where ns.notebook_id = n.id
              and (
                ns.user_id = auth.uid() OR
                ns.organization_id IN (
                  select organization_id
                  from public.organization_memberships
                  where user_id = auth.uid()
                )
              )
          )
        )
    )
  );

-- Allow unauthenticated users to read versions of public notebooks
create policy "notebook_versions_read_public" on public.notebook_versions for select
  to anon using (
    exists (
      select 1
      from public.notebooks n
      where n.id = notebook_versions.notebook_id
        and n.is_public = true
    )
  );

-- INSERT: Users can create notebook versions if they own the notebook
create policy "notebook_versions_write" on public.notebook_versions for insert
  to authenticated with check (
    exists (
      select 1
      from public.notebooks n
      join public.projects p on p.id = n.project_id
      where n.id = notebook_versions.notebook_id
        and n.created_by = auth.uid()
        and n.is_public = false
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::app_permissions)
        )
    )
  );

-- Trigger to set timestamps for notebooks
create trigger set_notebooks_timestamps
  before insert or update on public.notebooks
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking for notebooks
create trigger set_notebooks_user_tracking
  before insert or update on public.notebooks
  for each row execute function public.trigger_set_user_tracking();

