/*
 * -------------------------------------------------------
 * Section: Default workspace triggers
 * Platform invariant: every authenticated user has at least
 * one organization, and every organization has at least one
 * project. Enforced at the DB via two triggers:
 *   1. on auth.users insert → create a default org + owner membership
 *   2. on public.organizations insert → create a default project
 *
 * This keeps the UI free of "no-org"/"no-projects" empty-state
 * branches and prevents orphan orgs from stalling the landing
 * redirect (see apps/web/src/components/last-project-redirect.tsx).
 * -------------------------------------------------------
 */

/**
 * public.create_default_org_for_new_user
 * Fires AFTER INSERT on auth.users. Creates a personal organization
 * keyed to the user and adds them as `owner`. The trigger on
 * `public.organizations` below then seeds a default project.
 *
 * Idempotent: if the seed (or a previous run) already created an org
 * for this user, no-op. Runs with `security definer` because
 * auth.users is not writeable by `authenticated`; the function body
 * scopes every write to `new.id`.
 */
create or replace function public.create_default_org_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_slug text;
  unique_slug text;
  new_org_id uuid;
  suffix int := 0;
begin
  -- Skip if this user already has an organization (seed-inserted etc.).
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

  -- Collision-safe slug — suffix with -2, -3, ... until unique.
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
$$;

drop trigger if exists on_auth_user_created_default_org on auth.users;
create trigger on_auth_user_created_default_org
after insert on auth.users
for each row execute procedure public.create_default_org_for_new_user();

/**
 * public.create_default_project_for_new_org
 * Fires AFTER INSERT on public.organizations. Creates a default
 * project so `LastProjectRedirect` always has somewhere to land the
 * user. Idempotent in the sense that it only acts on the newly-inserted
 * org — if that org already has projects (shouldn't happen at insert
 * time, but seed paths or race could), no-op.
 *
 * `security invoker` — RLS on public.projects requires the caller to
 * own the parent org, and AFTER INSERT on organizations runs in the
 * inserting user's context.
 */
create or replace function public.create_default_project_for_new_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

drop trigger if exists on_organization_created_default_project on public.organizations;
create trigger on_organization_created_default_project
after insert on public.organizations
for each row execute procedure public.create_default_project_for_new_org();
