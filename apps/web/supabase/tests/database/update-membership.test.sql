begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('primary_owner', 'update-owner@test.run');
select tests.create_supabase_user('owner', 'update-admin@test.run');
select tests.create_supabase_user('member', 'update-member@test.run');
select tests.create_supabase_user('custom', 'update-custom@test.run');
select public.set_identifier('primary_owner', 'update-owner@test.run');
select public.set_identifier('owner', 'update-admin@test.run');
select public.set_identifier('member', 'update-member@test.run');
select public.set_identifier('custom', 'update-custom@test.run');

select tests.create_supabase_user('test', 'test@supabase.com');

select public.authenticate_as('primary_owner');
insert into public.organizations (slug, name, user_id) values ('update-membership-org', 'Update Membership Org', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('owner'), public.get_organization_id_by_slug('update-membership-org'), 'owner'
union all select public.get_id_by_identifier('member'), public.get_organization_id_by_slug('update-membership-org'), 'analyst'
union all select public.get_id_by_identifier('custom'), public.get_organization_id_by_slug('update-membership-org'), 'analyst';
reset role;

select public.authenticate_as('member');

-- run an update query - prevent_memberships_update trigger only allows account_role changes
-- and member cannot change their own role to owner (need higher hierarchy)
update public.organization_memberships set account_role = 'owner' where user_id = auth.uid() and organization_id = public.get_organization_id_by_slug('update-membership-org');

select row_eq(
    $$ select account_role from public.organization_memberships where user_id = auth.uid() and organization_id = public.get_organization_id_by_slug('update-membership-org'); $$,
    row('analyst'::varchar),
    'Updates fail silently to any field of the organization_membership table when not permitted'
);

select * from finish();

rollback;
