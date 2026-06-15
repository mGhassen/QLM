/*
 * -------------------------------------------------------
 * Section: Invitations
 * We create the schema for the invitations. Invitations are the invitations for an organization sent to a user to join the organization.
 * -------------------------------------------------------
 */

create table if not exists
  public.invitations (
    id serial primary key,
    email varchar(255) not null,
    organization_id uuid references public.organizations (id) on delete cascade not null,
    invited_by uuid references auth.users on delete cascade not null,
    role varchar(50) references public.roles (name) not null,
    invite_token varchar(255) unique not null,
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    expires_at timestamptz default current_timestamp + interval '7 days' not null,
    unique (email, organization_id)
  );

comment on table public.invitations is 'The invitations for an organization';

comment on column public.invitations.organization_id is 'The organization the invitation is for';

comment on column public.invitations.invited_by is 'The user who invited the user';

comment on column public.invitations.role is 'The role for the invitation';

comment on column public.invitations.invite_token is 'The token for the invitation';

comment on column public.invitations.expires_at is 'The expiry date for the invitation';

comment on column public.invitations.email is 'The email of the user being invited';

-- Indexes on the invitations table
create index ix_invitations_organization_id on public.invitations (organization_id);

-- Revoke all on invitations table from authenticated and service_role
revoke all on public.invitations
from
  authenticated,
  service_role;

-- Open up access to invitations table for authenticated users and service_role
grant
select
,
  insert,
update,
delete on table public.invitations to authenticated,
service_role;

-- Enable RLS on the invitations table
alter table public.invitations enable row level security;

-- Note: Trigger removed - organizations are always team entities, no need to check

-- RLS on the invitations table
-- SELECT(invitations):
-- Users can read invitations if:
-- 1. They are a member of the organization (for managing invitations)
-- 2. The invitation is sent to their email (for accepting invitations)
create policy invitations_read_self on public.invitations for
select
  to authenticated using (
    public.has_role_on_organization(organization_id)
    or email = (auth.jwt() ->> 'email')
  );

-- INSERT(invitations):
-- Users can create invitations to users of an organization they are
-- a member of and have the 'invites.manage' permission AND the target role is not higher than the user's role
create policy invitations_create_self on public.invitations for insert to authenticated
with
  check (
    public.has_permission (
      (
        select
          auth.uid ()
      ),
      organization_id,
      'invites.manage'::public.app_permissions
    )
    and (public.has_more_elevated_role (
      (
        select
          auth.uid ()
      ),
      organization_id,
      role
    ) or public.has_same_role_hierarchy_level(
      (
        select
          auth.uid ()
      ),
      organization_id,
      role
    ))
  );

-- UPDATE(invitations):
-- Users can update invitations to users of an organization they are a member of and have the 'invites.manage' permission AND
-- the target role is not higher than the user's role
create policy invitations_update on public.invitations
for update
  to authenticated using (
    public.has_permission (
      (
        select
          auth.uid ()
      ),
      organization_id,
      'invites.manage'::public.app_permissions
    )
    and public.has_more_elevated_role (
      (
        select
          auth.uid ()
      ),
      organization_id,
      role
    )
  )
with
  check (
    public.has_permission (
      (
        select
          auth.uid ()
      ),
      organization_id,
      'invites.manage'::public.app_permissions
    )
    and public.has_more_elevated_role (
      (
        select
          auth.uid ()
      ),
      organization_id,
      role
    )
  );

-- DELETE(public.invitations):
-- Users can delete invitations to users of an organization they are a member of and have the 'invites.manage' permission
create policy invitations_delete on public.invitations for delete to authenticated using (
  has_role_on_organization (organization_id)
  and public.has_permission (
    (
      select
        auth.uid ()
    ),
    organization_id,
    'invites.manage'::public.app_permissions
  )
);

-- Functions "public.accept_invitation"
-- Function to accept an invitation to an organization
create
or replace function accept_invitation (token text, user_id uuid) returns uuid
set
  search_path = '' as $$
declare
    target_organization_id uuid;
    target_role varchar(50);
begin
    select
        organization_id,
        role into target_organization_id,
        target_role
    from
        public.invitations
    where
        invite_token = token
        and expires_at > now();

    if not found then
        raise exception 'Invalid or expired invitation token';
    end if;

    insert into public.organization_memberships(
        user_id,
        organization_id,
        account_role)
    values (
        accept_invitation.user_id,
        target_organization_id,
        target_role);

    delete from public.invitations
    where invite_token = token;

    return target_organization_id;
end;

$$ language plpgsql;

grant
execute on function accept_invitation (text, uuid) to service_role;

-- Function "public.create_invitation"
-- create an invitation to an organization
create
or replace function public.create_invitation (organization_id uuid, email text, role varchar(50)) returns public.invitations
set
  search_path = '' as $$
declare
    new_invitation public.invitations;
    invite_token text;
begin
    invite_token := extensions.uuid_generate_v4();

    insert into public.invitations(
        email,
        organization_id,
        invited_by,
        role,
        invite_token)
    values (
        email,
        organization_id,
        auth.uid(),
        role,
        invite_token)
returning
    * into new_invitation;

    return new_invitation;

end;

$$ language plpgsql;

grant
execute on function public.create_invitation (uuid, text, varchar(50)) to authenticated,
service_role;

-- Function "public.get_organization_invitations"
-- List the organization invitations by the organization slug
create
or replace function public.get_organization_invitations (org_slug text) returns table (
  id integer,
  email varchar(255),
  organization_id uuid,
  invited_by uuid,
  role varchar(50),
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz,
  inviter_name varchar,
  inviter_email varchar
)
set
  search_path = '' as $$
begin
    return query
    select
        invitation.id,
        invitation.email,
        invitation.organization_id,
        invitation.invited_by,
        invitation.role,
        invitation.created_at,
        invitation.updated_at,
        invitation.expires_at,
        org.name,
        org.email
    from
        public.invitations as invitation
        join public.organizations as org on invitation.organization_id = org.id
    where
        org.slug = org_slug;

end;

$$ language plpgsql;

grant
execute on function public.get_organization_invitations (text) to authenticated,
service_role;

-- Function "public.add_invitations_to_organization"
-- Add invitations to an organization
create
or replace function public.add_invitations_to_organization (
  org_slug text,
  invitations public.invitation[]
) returns public.invitations[]
set
  search_path = '' as $$
declare
    new_invitation public.invitations;
    all_invitations public.invitations[] := array[]::public.invitations[];
    invite_token text;
    email text;
    role varchar(50);
begin
    FOREACH email,
    role in array invitations loop
        invite_token := extensions.uuid_generate_v4();

        insert into public.invitations(
            email,
            organization_id,
            invited_by,
            role,
            invite_token)
        values (
            email,
(
                select
                    id
                from
                    public.organizations
                where
                    slug = org_slug), auth.uid(), role, invite_token)
    returning
        * into new_invitation;

        all_invitations := array_append(all_invitations, new_invitation);

    end loop;

    return all_invitations;

end;

$$ language plpgsql;

grant
execute on function public.add_invitations_to_organization (text, public.invitation[]) to authenticated,
service_role;
