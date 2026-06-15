-- Function "public.has_permission"
-- Create a function to check if a user has a permission on an organization
-- Note: account_id parameter now refers to organization_id (organization id)
create
or replace function public.has_permission (
  user_id uuid,
  organization_id uuid,
  permission_name public.app_permissions
) returns boolean
set
  search_path = '' as $$
begin
    return exists(
        select
            1
        from
            public.organization_memberships
	    join public.role_permissions on
		organization_memberships.account_role =
		role_permissions.role
        where
            organization_memberships.user_id = has_permission.user_id
            and organization_memberships.organization_id = has_permission.organization_id
            and role_permissions.permission = has_permission.permission_name);

end;

$$ language plpgsql;

grant
execute on function public.has_permission (uuid, uuid, public.app_permissions) to authenticated,
service_role;


-- Function "public.add_current_user_to_new_organization"
-- Trigger to add the current user to a new organization as the primary owner
create
or replace function public.add_current_user_to_new_organization () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
    if new.user_id = auth.uid() then
        insert into public.organization_memberships(
            organization_id,
            user_id,
            account_role)
        values(
            new.id,
            auth.uid(),
            public.get_upper_system_role());

    end if;

    return NEW;

end;

$$;



-- Authenticated users can read role permissions
grant
select
  on table public.role_permissions to authenticated;

-- Function "public.has_more_elevated_role"
-- Check if a user has a more elevated role than the target role
-- Note: target_account_id parameter now refers to organization_id (organization id)
create
or replace function public.has_more_elevated_role (
  target_user_id uuid,
  target_account_id uuid,
  role_name varchar
) returns boolean
set
  search_path = '' as $$
declare
    declare is_primary_owner boolean;
    user_role_hierarchy_level int;
    target_role_hierarchy_level int;
begin
    -- Check if the user is the primary owner of the organization
    select
        exists (
            select
                1
            from
                public.organizations
            where
                id = target_account_id
                and user_id = target_user_id) into is_primary_owner;

    -- If the user is the primary owner, they have the highest role and can
    --   perform any action
    if is_primary_owner then
        return true;
    end if;

    -- Get the hierarchy level of the user's role within the organization
    select
        hierarchy_level into user_role_hierarchy_level
    from
        public.roles
    where
        name =(
            select
                account_role
            from
                public.organization_memberships
            where
                organization_id = target_account_id
                and target_user_id = user_id);

    if user_role_hierarchy_level is null then
        return false;
    end if;

    -- Get the hierarchy level of the target role
    select
        hierarchy_level into target_role_hierarchy_level
    from
        public.roles
    where
        name = role_name;

    -- If the target role does not exist, the user cannot perform the action
    if target_role_hierarchy_level is null then
        return false;
    end if;

    -- If the user's role is higher than the target role, they can perform
    --   the action
    return user_role_hierarchy_level < target_role_hierarchy_level;

end;

$$ language plpgsql;

grant
execute on function public.has_more_elevated_role (uuid, uuid, varchar) to authenticated,
service_role;

-- Function "public.has_same_role_hierarchy_level"
-- Check if a user has the same role hierarchy level as the target role
-- Note: target_account_id parameter now refers to organization_id (organization id)
create
or replace function public.has_same_role_hierarchy_level (
  target_user_id uuid,
  target_account_id uuid,
  role_name varchar
) returns boolean
set
  search_path = '' as $$
declare
    is_primary_owner boolean;
    user_role_hierarchy_level int;
    target_role_hierarchy_level int;
begin
    -- Check if the user is the primary owner of the organization
    select
        exists (
            select
                1
            from
                public.organizations
            where
                id = target_account_id
                and user_id = target_user_id) into is_primary_owner;

    -- If the user is the primary owner, they have the highest role and can perform any action
    if is_primary_owner then
        return true;
    end if;

    -- Get the hierarchy level of the user's role within the organization
    select
        hierarchy_level into user_role_hierarchy_level
    from
        public.roles
    where
        name =(
            select
                account_role
            from
                public.organization_memberships
            where
                organization_id = target_account_id
                and target_user_id = user_id);

    -- If the user does not have a role in the organization, they cannot perform the action
    if user_role_hierarchy_level is null then
        return false;
    end if;

    -- Get the hierarchy level of the target role
    select
        hierarchy_level into target_role_hierarchy_level
    from
        public.roles
    where
        name = role_name;

    -- If the target role does not exist, the user cannot perform the action
    if target_role_hierarchy_level is null then
        return false;
    end if;

   -- check the user's role hierarchy level is the same as the target role
    return user_role_hierarchy_level = target_role_hierarchy_level;

end;

$$ language plpgsql;

grant
execute on function public.has_same_role_hierarchy_level (uuid, uuid, varchar) to authenticated,
service_role;

-- Function "public.is_notebook_owner"
-- Check if the current user is the owner of a notebook
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
-- This function bypasses RLS on notebooks table to check ownership
create or replace function public.is_notebook_owner(target_notebook_id uuid) 
returns boolean 
language plpgsql 
security definer
set search_path = '' as $$
declare
  is_owner boolean;
begin
  -- Check if the current user is the owner (bypassing RLS due to SECURITY DEFINER)
  select exists (
    select 1
    from public.notebooks
    where id = target_notebook_id
      and created_by = auth.uid()
  ) into is_owner;
  
  return is_owner;
end;
$$;

grant execute on function public.is_notebook_owner(uuid) to authenticated, service_role;

-- Function "public.is_conversation_owner"
-- Check if the current user is the owner of a conversation
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
-- This function bypasses RLS on conversations table to check ownership
create or replace function public.is_conversation_owner(target_conversation_id uuid) 
returns boolean 
language plpgsql 
security definer
set search_path = '' as $$
declare
  is_owner boolean;
begin
  -- Check if the current user is the owner (bypassing RLS due to SECURITY DEFINER)
  select exists (
    select 1
    from public.conversations
    where id = target_conversation_id
      and created_by = auth.uid()
  ) into is_owner;
  
  return is_owner;
end;
$$;

grant execute on function public.is_conversation_owner(uuid) to authenticated, service_role;

-- Enable RLS on the role_permissions table
alter table public.role_permissions enable row level security;

-- RLS on the role_permissions table
-- SELECT(role_permissions):
-- Authenticated Users can read global permissions
create policy role_permissions_read on public.role_permissions for
select
  to authenticated using (true);
