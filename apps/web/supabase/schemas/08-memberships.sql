
-- Function "public.prevent_organization_owner_membership_delete"
-- Trigger to prevent a primary owner from being removed from an organization
create or replace function public.prevent_organization_owner_membership_delete () returns trigger
set search_path = '' as $$ begin if exists(
    select 1
    from public.organizations
    where id = old.organization_id
      and user_id = old.user_id
  ) then raise exception 'The primary organization owner cannot be removed from the organization membership list';
end if;
return old;
end;
$$ language plpgsql;
create or replace trigger prevent_organization_owner_membership_delete_check before delete on public.organization_memberships for each row execute function public.prevent_organization_owner_membership_delete ();
-- Function "public.prevent_memberships_update"
-- Trigger to prevent updates to organization memberships with the exception of the account_role
create or replace function public.prevent_memberships_update () returns trigger
set search_path = '' as $$ begin if new.account_role <> old.account_role then return new;
end if;
raise exception 'Only the account_role can be updated';
end;
$$ language plpgsql;
create or replace trigger prevent_memberships_update_check before
update on public.organization_memberships for each row execute function public.prevent_memberships_update ();

-- Function "public.is_organization_member"
-- Check if a user is a member of an organization or not
create or replace function public.is_organization_member (organization_id uuid, user_id uuid) returns boolean language sql security definer
set search_path = '' as $$
select exists(
    select 1
    from public.organization_memberships membership
    where public.has_role_on_organization(organization_id)
      and membership.user_id = is_organization_member.user_id
      and membership.organization_id = is_organization_member.organization_id
  );
$$;
grant execute on function public.is_organization_member (uuid, uuid) to authenticated,
  service_role;
-- RLS
-- SELECT(roles)
-- authenticated users can query roles
create policy roles_read on public.roles for
select to authenticated using (true);
-- Function "public.can_action_organization_member"
-- Check if a user can perform management actions on an organization member
create or replace function public.can_action_organization_member (target_organization_id uuid, target_user_id uuid) returns boolean
set search_path = '' as $$
declare permission_granted boolean;
target_user_hierarchy_level int;
current_user_hierarchy_level int;
is_org_owner boolean;
target_user_role varchar(50);
begin if target_user_id = auth.uid() then raise exception 'You cannot update your own organization membership with this function';
end if;
-- an organization owner can action any member of the organization
if public.is_organization_owner(target_organization_id) then return true;
end if;
-- check the target user is the primary owner of the organization
select exists (
    select 1
    from public.organizations
    where id = target_organization_id
      and user_id = target_user_id
  ) into is_org_owner;
if is_org_owner then raise exception 'The primary organization owner cannot be actioned';
end if;
-- validate the auth user has the required permission on the organization
-- to manage members of the organization
select public.has_permission(
    auth.uid(),
    target_organization_id,
    'members.manage'::public.app_permissions
  ) into permission_granted;
-- if the user does not have the required permission, raise an exception
if not permission_granted then raise exception 'You do not have permission to action a member from this organization';
end if;
-- get the role of the target user
select om.account_role,
  r.hierarchy_level
from public.organization_memberships as om
  join public.roles as r on om.account_role = r.name
where om.organization_id = target_organization_id
  and om.user_id = target_user_id into target_user_role,
  target_user_hierarchy_level;
-- get the hierarchy level of the current user
select r.hierarchy_level into current_user_hierarchy_level
from public.roles as r
  join public.organization_memberships as om on r.name = om.account_role
where om.organization_id = target_organization_id
  and om.user_id = auth.uid();
if target_user_role is null then raise exception 'The target user does not have a role on the organization';
end if;
if current_user_hierarchy_level is null then raise exception 'The current user does not have a role on the organization';
end if;
-- check the current user has a higher role than the target user
if current_user_hierarchy_level >= target_user_hierarchy_level then raise exception 'You do not have permission to action a member from this organization';
end if;
return true;
end;
$$ language plpgsql;
grant execute on function public.can_action_organization_member (uuid, uuid) to authenticated,
  service_role;
-- Function "public.share_organization_with_user"
-- Check if the account owner and current user are members of at least one common organization
create or replace function public.share_organization_with_user (account_owner_user_id uuid) returns boolean
language sql security definer
set search_path = '' as $$
  select exists(
    select 1
    from public.organization_memberships om1
    inner join public.organization_memberships om2
      on om1.organization_id = om2.organization_id
    where om1.user_id = account_owner_user_id
      and om2.user_id = auth.uid()
  );
$$;
grant execute on function public.share_organization_with_user (uuid) to authenticated, service_role;
-- RLS on the accounts table
-- SELECT(accounts):
-- Users can read their personal account or accounts of users who share an organization with them
create policy accounts_read on public.accounts for
select to authenticated using (
    (
      select auth.uid ()
    ) = user_id
    or public.share_organization_with_user(user_id)
  );
-- DELETE(organization_memberships):
-- Users with the required role can remove members from an organization or remove their own
create policy organization_memberships_delete on public.organization_memberships for delete to authenticated using (
  (
    user_id = (
      select auth.uid ()
    )
  )
  or public.can_action_organization_member (organization_id, user_id)
);
-- SELECT(organization_memberships):
-- Users can read organization memberships if they are a member
create policy organization_memberships_read on public.organization_memberships for
select to authenticated using (
    (
      (
        select auth.uid ()
      ) = user_id
    )
    or public.is_organization_member (
      organization_id,
      (
        select auth.uid()
      )
    )
  );