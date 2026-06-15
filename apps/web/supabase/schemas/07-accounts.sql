

-- RLS on the accounts table
-- UPDATE(accounts):
-- Team owners can update their accounts
create policy accounts_self_update on public.accounts
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

-- Function "public.transfer_organization_ownership"
-- Function to transfer the ownership of an organization to another user
create
or replace function public.transfer_organization_ownership (target_organization_id uuid, new_owner_id uuid) returns void
security definer
set
  search_path = '' as $$
begin
    if current_user not in('service_role') then
        raise exception 'You do not have permission to transfer organization ownership';
    end if;

    -- verify the user is already a member of the organization
    if not exists(
        select
            1
        from
            public.organization_memberships
        where
            target_organization_id = organization_id
            and user_id = new_owner_id) then
        raise exception 'The new owner must be a member of the organization';
    end if;

    -- update the primary owner of the organization
    update
        public.organizations
    set
        user_id = new_owner_id
    where
        id = target_organization_id;

    -- update membership assigning it the hierarchy role
    update
        public.organization_memberships
    set
        account_role =(
            public.get_upper_system_role())
    where
        target_organization_id = organization_id
        and user_id = new_owner_id
        and account_role <>(
            public.get_upper_system_role());

end;

$$ language plpgsql;

grant
execute on function public.transfer_organization_ownership (uuid, uuid) to service_role;

-- Function "public.is_account_owner"
-- Function to check if a user is the owner of an account
create
or replace function public.is_account_owner (account_id uuid) returns boolean
set
  search_path = '' as $$
    select
        exists(
            select
                1
            from
                public.accounts
            where
                id = is_account_owner.account_id
                and user_id = auth.uid());
$$ language sql;

grant
execute on function public.is_account_owner (uuid) to authenticated,
service_role;


-- Function "public.protect_account_fields"
-- Function to protect account fields from being updated
create
or replace function public.protect_account_fields () returns trigger as $$
begin
    if current_user in('authenticated', 'anon') then
	if new.id <> old.id or new.user_id <>
	    old.user_id or new.email <> old.email then
            raise exception 'You do not have permission to update this field';

        end if;

    end if;

    return NEW;

end
$$ language plpgsql
set
  search_path = '';

-- trigger to protect account fields
create trigger protect_account_fields before
update on public.accounts for each row
execute function public.protect_account_fields ();

-- Function "public.get_upper_system_role"
-- Function to get the highest system role for an account
create
or replace function public.get_upper_system_role () returns varchar
set
  search_path = '' as $$
declare
    role varchar(50);
begin
    select name from public.roles
      where hierarchy_level = 1 into role;

    return role;
end;
$$ language plpgsql;

grant
execute on function public.get_upper_system_role () to service_role;

-- trigger the function whenever a new organization is created
-- Note: This trigger is created in 18-organizations.sql after the trigger functions are available

-- create a trigger to update the account email when the primary owner email is updated
create
or replace function public.handle_update_user_email () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
    update
        public.accounts
    set
        email = new.email
    where
        user_id = new.id;

    return new;

end;

$$;

-- trigger the function every time a user email is updated
create trigger "on_auth_user_updated"
after
update of email on auth.users for each row
execute procedure public.handle_update_user_email ();


/**
 * -------------------------------------------------------
 * Section: Slugify
 * We create the schema for the slugify functions. Slugify functions are used to create slugs from strings.
 * We use this for ensure unique slugs for accounts.
 * -------------------------------------------------------
 */
-- Create a function to slugify a string
-- useful for turning an account name into a unique slug
create
or replace function public.slugify ("value" text) returns text as $$
    -- removes accents (diacritic signs) from a given string --
    with "unaccented" as(
        select
            public.unaccent("value") as "value"
),
-- lowercases the string
"lowercase" as(
    select
        lower("value") as "value"
    from
        "unaccented"
),
-- remove single and double quotes
"removed_quotes" as(
    select
	regexp_replace("value", '[''"]+', '',
	    'gi') as "value"
    from
        "lowercase"
),
-- replaces anything that's not a letter, number, hyphen('-'), or underscore('_') with a hyphen('-')
"hyphenated" as(
    select
	regexp_replace("value", '[^a-z0-9\\-_]+', '-',
	    'gi') as "value"
    from
        "removed_quotes"
),
-- trims hyphens('-') if they exist on the head or tail of
--   the string
"trimmed" as(
    select
	regexp_replace(regexp_replace("value", '\-+$',
	    ''), '^\-', '') as "value" from "hyphenated"
)
        select
            "value"
        from
            "trimmed";
$$ language SQL strict immutable
set
  search_path to '';

grant
execute on function public.slugify (text) to service_role,
authenticated;


-- Function "public.set_slug_from_account_name"
-- Set the slug from the account name and increment if the slug exists
create
or replace function public.set_slug_from_account_name () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
    sql_string varchar;
    tmp_slug varchar;
    increment integer;
    tmp_row record;
    tmp_row_count integer;
begin
    tmp_row_count = 1;

    increment = 0;

    while tmp_row_count > 0 loop
        if increment > 0 then
            tmp_slug = public.slugify(new.name || ' ' || increment::varchar);

        else
            tmp_slug = public.slugify(new.name);

        end if;

	sql_string = format('select count(1) cnt from public.accounts where slug = ''' || tmp_slug ||
	    '''; ');

        for tmp_row in execute (sql_string)
            loop
                raise notice 'tmp_row %', tmp_row;

                tmp_row_count = tmp_row.cnt;

            end loop;

        increment = increment +1;

    end loop;

    new.slug := tmp_slug;

    return NEW;

end
$$;

-- Function "public.setup_new_user"
-- Setup a new user account after user creation
create
or replace function public.setup_new_user () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
    user_name text;
    picture_url text;
begin
    if new.raw_user_meta_data ->> 'name' is not null then
        user_name := new.raw_user_meta_data ->> 'name';

    end if;

    if user_name is null and new.email is not null then
        user_name := split_part(new.email, '@', 1);

    end if;

    if user_name is null then
        user_name := '';

    end if;

    if new.raw_user_meta_data ->> 'avatar_url' is not null then
        picture_url := new.raw_user_meta_data ->> 'avatar_url';
    else
        picture_url := null;
    end if;

    insert into public.accounts(
        id,
        user_id,
        name,
        picture_url,
        email)
    values (
        new.id,
        new.id,
        user_name,
        picture_url,
        new.email);

    return new;

end;

$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.setup_new_user ();

/**
 * -------------------------------------------------------
 * Section: Functions
 * We create the schema for the functions
 * -------------------------------------------------------
 */
-- Note: create_team_account function removed - use organizations instead
-- Note: RLS policies for team accounts removed - organizations handle this

-- Function "public.get_organization_members"
-- Function to get the members of an organization by the organization slug
create
or replace function public.get_organization_members (org_slug text) returns table (
  id uuid,
  user_id uuid,
  organization_id uuid,
  role varchar(50),
  role_hierarchy_level int,
  organization_user_id uuid,
  name varchar,
  email varchar,
  picture_url varchar,
  created_at timestamptz,
  updated_at timestamptz
) language plpgsql
set
  search_path = '' as $$
begin
    return QUERY
    select
        acc.id,
        om.user_id,
        om.organization_id,
        om.account_role,
        r.hierarchy_level,
        o.user_id as organization_user_id,
        acc.name,
        acc.email,
        acc.picture_url,
        om.created_at,
        om.updated_at
    from
        public.organization_memberships om
        join public.organizations o on o.id = om.organization_id
        join public.accounts acc on acc.id = om.user_id
        join public.roles r on r.name = om.account_role
    where
        o.slug = org_slug;

end;

$$;

grant
execute on function public.get_organization_members (text) to authenticated,
service_role;