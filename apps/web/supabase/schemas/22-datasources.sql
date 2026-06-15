-- RLS policies
-- SELECT: Users can read organization datasources, own private datasources, or public datasources
create policy "datasources_read" on public.datasources for select
  to authenticated using (
    -- Organization datasources (not private, not public)
    (is_private = false AND is_public = false AND exists (
      select 1
      from public.projects p
      where p.id = datasources.project_id
        and public.has_role_on_organization(p.organization_id)
    )) OR
    -- Own private datasources
    (is_private = true AND created_by = auth.uid()) OR
    -- Public datasources
    is_public = true
  );

-- Allow unauthenticated users to read public datasources
create policy "datasources_read_public" on public.datasources for select
  to anon using (is_public = true);

-- INSERT: Users can create datasources if they have permission on the organization
-- OR if remixing (remixed_from is set, which means source is public)
create policy "datasources_write" on public.datasources for insert
  to authenticated with check (
    created_by = auth.uid() AND
    (
      -- Organization datasource (Owner/Administrator)
      (is_private = false AND is_public = false AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      )) OR
      -- Private datasource (Analyst)
      (is_private = true AND is_public = false AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      )) OR
      -- Public datasource (with publish permission)
      (is_public = true AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.publish'::app_permissions)
          )
      )) OR
      -- Remix (remixed_from indicates this is a remix)
      remixed_from IS NOT NULL
    )
  );

-- UPDATE: Users can update own datasources (not public ones)
-- Note: Once a datasource is public, it cannot be made private again via direct update
-- Use a separate function if you need to unpublish
create policy "datasources_update" on public.datasources for update
  to authenticated using (
    created_by = auth.uid() AND
    is_public = false AND
    (
      -- Organization datasource
      (is_private = false AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      )) OR
      -- Private datasource
      (is_private = true AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      ))
    )
  )
  with check (
    created_by = auth.uid() AND
    is_public = false
  );

-- DELETE: Users can delete own datasources (not public ones)
create policy "datasources_delete" on public.datasources for delete
  to authenticated using (
    created_by = auth.uid() AND
    is_public = false AND
    (
      -- Organization datasource
      (is_private = false AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      )) OR
      -- Private datasource
      (is_private = true AND exists (
        select 1
        from public.projects p
        where p.id = datasources.project_id
          and (
            public.is_organization_owner(p.organization_id) or
            public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::app_permissions)
          )
      ))
    )
  );

-- Trigger to set timestamps
create trigger set_datasources_timestamps
  before insert or update on public.datasources
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking
create trigger set_datasources_user_tracking
  before insert or update on public.datasources
  for each row execute function public.trigger_set_user_tracking();

