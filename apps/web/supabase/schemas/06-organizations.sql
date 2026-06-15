/*
 * -------------------------------------------------------
 * Section: Organizations (RLS Policies, Triggers, and Slug Functions)
 * Note: The organizations table itself is defined in 03-accounts.sql
 * This file contains RLS policies, triggers, and slug-related functions for organizations.
 * -------------------------------------------------------
 */
-- Function "public.is_organization_owner"
-- Function to check if a user is the primary owner of an organization
create or replace function public.is_organization_owner (organization_id uuid) returns boolean
language sql
security definer
set search_path = '' as $$
select exists(
    select 1
    from public.organizations
    where id = is_organization_owner.organization_id
      and user_id = auth.uid()
  );
$$;
grant execute on function public.is_organization_owner (uuid) to authenticated,
  service_role;
-- Function "public.has_valid_invitation_for_organization"
-- Check if the current user has a valid invitation for the given organization
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
-- This function bypasses RLS on invitations table to check for valid invitations
create or replace function public.has_valid_invitation_for_organization(target_organization_id uuid) returns boolean language plpgsql security definer
set search_path = '' as $$
declare user_email text;
has_invitation boolean;
begin -- Get user email from JWT or auth.users
user_email := coalesce(
  auth.jwt()->>'email',
  (
    select email
    from auth.users
    where id = auth.uid()
  )
);
-- Check if invitation exists (bypassing RLS due to SECURITY DEFINER)
select exists (
    select 1
    from public.invitations
    where invitations.organization_id = has_valid_invitation_for_organization.target_organization_id
      and invitations.email = user_email
      and invitations.expires_at > now()
  ) into has_invitation;
return has_invitation;
end;
$$;
grant execute on function public.has_valid_invitation_for_organization(uuid) to authenticated,
  service_role;
-- Function "public.has_role_on_organization"
-- Function to check if a user has a role on an organization
create or replace function public.has_role_on_organization (
    organization_id uuid,
    account_role varchar(50) default null
  ) returns boolean language sql security definer
set search_path = '' as $$
select exists(
    select 1
    from public.organization_memberships membership
    where membership.user_id = (
        select auth.uid()
      )
      and membership.organization_id = has_role_on_organization.organization_id
      and(
        (
          membership.account_role = has_role_on_organization.account_role
          or has_role_on_organization.account_role is null
        )
      )
  );
$$;
grant execute on function public.has_role_on_organization (uuid, varchar) to authenticated;
-- RLS policies
-- SELECT: Users can read organizations if they have a role on the organization
-- OR if they have a valid invitation for that organization
create policy "organizations_read" on public.organizations for
select to authenticated using (
    user_id = (
      select auth.uid()
    )
    or public.has_role_on_organization(id)
    or public.has_valid_invitation_for_organization(id)
  );
-- INSERT: Users can create organizations if they are authenticated
create policy "organizations_write" on public.organizations for
insert to authenticated with check (
    user_id = (
      select auth.uid()
    )
  );
-- Function to prevent credit updates by authenticated users
create or replace function public.prevent_credit_updates() returns trigger language plpgsql security definer
set search_path = '' as $$ begin -- Allow non-authenticated users (service_role, SECURITY DEFINER functions) to update credits
  -- Credit management functions use SECURITY DEFINER and should be able to update credits
  if current_user in ('authenticated', 'anon') then -- Check if any credit columns are being modified
  if (
    old.credits_balance is distinct
    from new.credits_balance
      or old.credits_total_purchased is distinct
    from new.credits_total_purchased
      or old.credits_total_consumed is distinct
    from new.credits_total_consumed
      or old.credits_total_allocated is distinct
    from new.credits_total_allocated
  ) then -- Prevent authenticated users from updating credits directly
  -- Credit updates should go through dedicated functions (add_credits_to_organization, consume_credits, etc.)
  raise exception 'Credit fields cannot be updated directly. Use dedicated credit management functions instead.';
end if;
end if;
return new;
end;
$$;
grant execute on function public.prevent_credit_updates() to authenticated,
  service_role;
-- UPDATE: Users can update organizations if they are the owner or have permission
-- Note: Credit fields are protected by the prevent_credit_updates trigger
create policy "organizations_update" on public.organizations for
update to authenticated using (
    public.is_organization_owner(id)
    or public.has_permission(
      auth.uid(),
      id,
      'projects.manage'::app_permissions
    )
  ) with check (
    public.is_organization_owner(id)
    or public.has_permission(
      auth.uid(),
      id,
      'projects.manage'::app_permissions
    )
  );
-- DELETE: Users can delete organizations if they are the owner or have permission
create policy "organizations_delete" on public.organizations for delete to authenticated using (
  public.is_organization_owner(id)
  or public.has_permission(
    auth.uid(),
    id,
    'projects.manage'::app_permissions
  )
);
-- Trigger to set timestamps
create trigger set_organizations_timestamps before
insert
  or
update on public.organizations for each row execute function public.trigger_set_timestamps();
-- Trigger to set user tracking
create trigger set_organizations_user_tracking before
insert
  or
update on public.organizations for each row execute function public.trigger_set_user_tracking();
-- Trigger to prevent credit updates by authenticated users
create trigger prevent_organizations_credit_updates before
update on public.organizations for each row execute function public.prevent_credit_updates();
-- Trigger to add current user to new organization
create trigger "add_current_user_to_new_organization"
after
insert on public.organizations for each row execute function public.add_current_user_to_new_organization ();