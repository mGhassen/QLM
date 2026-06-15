-- Default workspace triggers: enforce the user → org → project
-- invariant at the DB layer. Mirrors
-- apps/web/supabase/schemas/45-default-workspace-triggers.sql.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_default_org_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  base_slug text;
  unique_slug text;
  new_org_id uuid;
  suffix int := 0;
begin
  if exists (
    select 1 from public.organizations where user_id = new.id
    union
    select 1 from public.organization_memberships where user_id = new.id
  ) then
    return new;
  end if;

  base_slug := coalesce(
    nullif(public.slugify(split_part(new.email, '@', 1)), ''),
    'workspace'
  );
  unique_slug := base_slug;

  while exists (select 1 from public.organizations where slug = unique_slug) loop
    suffix := suffix + 1;
    unique_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.organizations(id, slug, name, user_id, created_at, updated_at, created_by, updated_by)
  values (extensions.uuid_generate_v4(), unique_slug, base_slug, new.id, now(), now(), new.id, new.id)
  returning id into new_org_id;

  insert into public.organization_memberships(user_id, organization_id, account_role, created_at, updated_at, created_by, updated_by)
  values (new.id, new_org_id, 'owner', now(), now(), new.id, new.id);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_project_for_new_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from public.projects where organization_id = new.id) then
    return new;
  end if;

  insert into public.projects(id, organization_id, slug, name, description, status, created_at, updated_at, created_by, updated_by)
  values (
    extensions.uuid_generate_v4(),
    new.id,
    new.slug || '-default',
    'Default project',
    'Your default project — rename me or create new ones.',
    'active',
    now(),
    now(),
    new.user_id,
    new.user_id
  );

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_default_org ON auth.users;
CREATE TRIGGER on_auth_user_created_default_org
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_default_org_for_new_user();

DROP TRIGGER IF EXISTS on_organization_created_default_project ON public.organizations;
CREATE TRIGGER on_organization_created_default_project
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.create_default_project_for_new_org();
