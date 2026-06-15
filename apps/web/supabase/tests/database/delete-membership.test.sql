begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('primary_owner', 'delete-membership-owner@test.run');
select tests.create_supabase_user('owner', 'delete-membership-admin@test.run');
select tests.create_supabase_user('member', 'delete-membership-member@test.run');
select tests.create_supabase_user('custom', 'delete-membership-custom@test.run');
select tests.create_supabase_user('test', 'delete-membership-foreign@test.run');
select public.set_identifier('test', 'delete-membership-foreign@test.run');

select public.set_identifier('primary_owner', 'delete-membership-owner@test.run');
select public.set_identifier('owner', 'delete-membership-admin@test.run');
select public.set_identifier('member', 'delete-membership-member@test.run');
select public.set_identifier('custom', 'delete-membership-custom@test.run');

select public.authenticate_as('primary_owner');
insert into public.organizations (slug, name, user_id) values ('delete-membership-org', 'Delete Membership Org', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('owner'), public.get_organization_id_by_slug('delete-membership-org'), 'owner'
union all select public.get_id_by_identifier('member'), public.get_organization_id_by_slug('delete-membership-org'), 'analyst'
union all select public.get_id_by_identifier('custom'), public.get_organization_id_by_slug('delete-membership-org'), 'analyst';
reset role;

select public.authenticate_as('owner');

select throws_ok(
   $$ delete from public.organization_memberships
    where organization_id = public.get_organization_id_by_slug('delete-membership-org')
    and user_id = public.get_id_by_identifier('primary_owner') $$,
   'You do not have permission to action a member from this organization'
);

select public.authenticate_as('primary_owner');

select lives_ok(
   $$ delete from public.organization_memberships
      where organization_id = public.get_organization_id_by_slug('delete-membership-org')
      and user_id = public.get_id_by_identifier('member') $$,
    'Primary owner should be able to remove a member'
);

select public.authenticate_as('member');

select throws_ok(
   $$ delete from public.organization_memberships
    where organization_id = public.get_organization_id_by_slug('delete-membership-org')
    and user_id = public.get_id_by_identifier('owner') $$,
    'You do not have permission to action a member from this organization'
);

select public.authenticate_as('primary_owner');

select throws_ok(
    $$ delete from public.organization_memberships
       where organization_id = public.get_organization_id_by_slug('delete-membership-org')
       and user_id = auth.uid() $$,
    'The primary organization owner cannot be removed from the organization membership list'
);

select public.authenticate_as('primary_owner');

select lives_ok(
   $$ delete from public.organization_memberships
    where organization_id = public.get_organization_id_by_slug('delete-membership-org')
    and user_id = public.get_id_by_identifier('custom') $$,
    'Primary owner should be able to remove another member'
);

select public.authenticate_as('test');

select throws_ok(
    $$ delete from public.organization_memberships
      where organization_id = public.get_organization_id_by_slug('delete-membership-org')
      and user_id = tests.get_supabase_uid('owner'); $$,
      'You do not have permission to action a member from this organization'
 );

select public.authenticate_as('owner');

select isnt_empty(
    $$ select 1 from public.organization_memberships
    where organization_id = public.get_organization_id_by_slug('delete-membership-org')
    and user_id = tests.get_supabase_uid('owner'); $$,
    'Foreigners should not be able to remove members');

select public.authenticate_as('test');

select throws_ok(
   $$ delete from public.organization_memberships
   where organization_id = public.get_organization_id_by_slug('delete-membership-org')
   and user_id = auth.uid(); $$,
    'You do not have permission to action a member from this organization'
);

select * from finish();

rollback;