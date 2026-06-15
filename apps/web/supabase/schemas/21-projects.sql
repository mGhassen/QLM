-- RLS policies
-- SELECT: Users can read projects if they have a role on the organization
create policy "projects_read" on public.projects for select
  to authenticated using (
    public.has_role_on_organization(organization_id)
  );

-- INSERT: Users can create projects if they are the organization owner or have permission
create policy "projects_write" on public.projects for insert
  to authenticated with check (
    public.is_organization_owner(organization_id) or
    public.has_permission(auth.uid(), organization_id, 'projects.manage'::app_permissions)
  );

-- UPDATE: Users can update projects if they are the organization owner or have permission
create policy "projects_update" on public.projects for update
  to authenticated using (
    public.is_organization_owner(organization_id) or
    public.has_permission(auth.uid(), organization_id, 'projects.manage'::app_permissions)
  )
  with check (
    public.is_organization_owner(organization_id) or
    public.has_permission(auth.uid(), organization_id, 'projects.manage'::app_permissions)
  );

-- DELETE: Users can delete projects if they are the organization owner or have permission
create policy "projects_delete" on public.projects for delete
  to authenticated using (
    public.is_organization_owner(organization_id) or
    public.has_permission(auth.uid(), organization_id, 'projects.manage'::app_permissions)
  );

-- Trigger to set timestamps
create trigger set_projects_timestamps
  before insert or update on public.projects
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking
create trigger set_projects_user_tracking
  before insert or update on public.projects
  for each row execute function public.trigger_set_user_tracking();

