/*
 * -------------------------------------------------------
 * Section: Account Functions
 * We create the schema for the functions. Functions are the custom functions for the application.
 * -------------------------------------------------------
 */


--
-- VIEW "user_account_workspace":
-- we create a view to load the general app data for the authenticated
-- user which includes the user's personal account
create or replace view
    public.user_account_workspace
            with
            (security_invoker = true) as
select
    accounts.id as id,
    accounts.name as name,
    accounts.picture_url as picture_url,
    null::public.subscription_status as subscription_status
from
    public.accounts
where
    user_id = (select auth.uid ())
limit
    1;

grant
    select
    on public.user_account_workspace to authenticated,
    service_role;

--
-- VIEW "user_accounts":
-- we create a view to load the user's organizations and memberships
-- useful to display the user's organizations in the app
create or replace view
    public.user_accounts (id, name, picture_url, slug, role)
        with
        (security_invoker = true) as
select
    org.id,
    org.name,
    org.picture_url,
    org.slug,
    membership.account_role
from
    public.organizations org
        join public.organization_memberships membership on org.id = membership.organization_id
where
    membership.user_id = (select auth.uid ());

grant
    select
    on public.user_accounts to authenticated,
    service_role;

--
-- Function "public.organization_workspace"
-- Load all the data for an organization workspace
create or replace function public.organization_workspace(org_slug text)
returns table (
    id uuid,
    name varchar(255),
    picture_url varchar(1000),
    slug text,
    role varchar(50),
    role_hierarchy_level int,
    user_id uuid,
    subscription_status public.subscription_status,
    permissions public.app_permissions[]
)
set search_path to ''
as $$
begin
    return QUERY
    select
        org.id,
        org.name,
        org.picture_url,
        org.slug,
        organization_memberships.account_role,
        roles.hierarchy_level,
        org.user_id,
        subscriptions.status,
        array_agg(role_permissions.permission)
    from
        public.organizations org
        join public.organization_memberships on org.id = organization_memberships.organization_id
        left join public.subscriptions on org.id = subscriptions.organization_id
        join public.roles on organization_memberships.account_role = roles.name
        left join public.role_permissions on organization_memberships.account_role = role_permissions.role
    where
        org.slug = org_slug
        and public.organization_memberships.user_id = (select auth.uid())
    group by
        org.id,
        organization_memberships.account_role,
        subscriptions.status,
        roles.hierarchy_level;
end;
$$ language plpgsql;

grant
execute on function public.organization_workspace (text) to authenticated,
service_role;
