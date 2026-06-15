begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('primary_owner', 'memberships-owner@test.run');
select tests.create_supabase_user('owner', 'memberships-admin@test.run');
select tests.create_supabase_user('member', 'memberships-member@test.run');
select tests.create_supabase_user('custom', 'memberships-custom@test.run');
select tests.create_supabase_user('test', 'memberships-foreign@test.run');

select public.set_identifier('primary_owner', 'memberships-owner@test.run');
select public.set_identifier('owner', 'memberships-admin@test.run');
select public.set_identifier('member', 'memberships-member@test.run');
select public.set_identifier('custom', 'memberships-custom@test.run');

select public.authenticate_as('primary_owner');
insert into public.organizations (slug, name, user_id) values ('memberships-test-org', 'Memberships Test Org', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('owner'), public.get_organization_id_by_slug('memberships-test-org'), 'administrator'
union all select public.get_id_by_identifier('member'), public.get_organization_id_by_slug('memberships-test-org'), 'analyst'
union all select public.get_id_by_identifier('custom'), public.get_organization_id_by_slug('memberships-test-org'), 'analyst';
reset role;

select public.authenticate_as('owner');

select is(
  (select public.is_organization_member(
    public.get_organization_id_by_slug('memberships-test-org'),
    tests.get_supabase_uid('member')
  )),
  true,
  'The primary organization owner can check if a member is a team member'
);

select public.authenticate_as('member');

select is(
  (select public.is_organization_member(
    public.get_organization_id_by_slug('memberships-test-org'),
    tests.get_supabase_uid('owner')
  )),
  true,
  'The member can check if another member is a team member'
);

select is(
  (select public.has_role_on_organization(
    public.get_organization_id_by_slug('memberships-test-org')
  )),
  true,
  'The member can check if they have a role on the organization'
);

select isnt_empty(
  $$ select * from public.get_organization_members('memberships-test-org') $$,
  'The member can query the organization members using get_organization_members'
);

select public.authenticate_as('test');

select is(
  (select public.is_organization_member(
    public.get_organization_id_by_slug('memberships-test-org'),
    tests.get_supabase_uid('owner')
  )),
  false,
  'The foreigner cannot check if a member is a team member'
);

select is(
  (select public.has_role_on_organization(
    public.get_organization_id_by_slug('memberships-test-org')
  )),
  false,
  'The foreigner does not have a role on the organization'
);

select is_empty(
  $$ select * from public.organization_memberships where organization_id = public.get_organization_id_by_slug('memberships-test-org') $$,
  'The foreigner cannot query the organization memberships'
);

select is_empty(
  $$ select * from public.organizations where id = public.get_organization_id_by_slug('memberships-test-org') $$,
  'The foreigner cannot query the organization'
);

select is_empty(
  $$ select * from public.get_organization_members('memberships-test-org') $$,
  'The foreigner cannot query the organization members'
);

select * from finish();

rollback;