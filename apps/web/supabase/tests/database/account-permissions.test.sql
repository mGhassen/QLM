BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('test1', 'test1@test.com');
select tests.create_supabase_user('test2');

select public.authenticate_as('test1');

insert into public.organizations (slug, name, user_id) values ('test', 'Test', auth.uid());

select row_eq(
  $$ select public.has_permission(
  auth.uid(), public.get_organization_id_by_slug('test'), 'members.manage'::app_permissions) $$,
    row(true::boolean),
    'The owner of the organization should have the members.manage permission'
);

select row_eq(
  $$ select public.has_permission(
  auth.uid(), public.get_organization_id_by_slug('test'), 'billing.manage'::app_permissions) $$,
    row(true::boolean),
    'The owner of the organization should have the billing.manage permission'
);

select public.authenticate_as('test2');

select row_eq(
  $$ select public.has_permission(
  auth.uid(), public.get_organization_id_by_slug('test'), 'members.manage'::app_permissions) $$,
    row(false::boolean),
    'Foreigners should not have the members.manage permission'
);

set local role postgres;

select throws_ok(
  $$ insert into public.roles (name, hierarchy_level) values ('owner', 4) $$,
  'duplicate key value violates unique constraint "roles_hierarchy_level_key"'
);

select throws_ok(
  $$ insert into public.roles (name, hierarchy_level) values ('custom-role-2', 1) $$,
  'duplicate key value violates unique constraint "roles_hierarchy_level_key"'
);

select throws_ok(
  $$ insert into public.roles (name, hierarchy_level) values ('owner', 1) $$,
  'duplicate key value violates unique constraint "roles_hierarchy_level_key"'
);

insert into public.roles (name, hierarchy_level) values ('custom-role', 99)
  on conflict (name) do nothing;

select setval(pg_get_serial_sequence('public.role_permissions', 'id'), (select coalesce(max(id), 1) from public.role_permissions));

insert into public.role_permissions (role, permission)
  values ('custom-role', 'members.manage'::public.app_permissions)
  on conflict (role, permission) do nothing;

update public.organization_memberships
    set account_role = 'custom-role'
    where organization_id = public.get_organization_id_by_slug('test')
        and user_id = tests.get_supabase_uid('test1');

select public.authenticate_as('test1');

select row_eq(
  $$ select public.has_permission(
  auth.uid(), public.get_organization_id_by_slug('test'), 'billing.manage'::app_permissions) $$,
    row(false::boolean),
    'The custom role should not have the billing.manage permission'
);

select row_eq(
  $$ select public.has_permission(
  auth.uid(), public.get_organization_id_by_slug('test'), 'members.manage'::app_permissions) $$,
    row(true::boolean),
    'The custom role should have the members.manage permission'
);

select * from finish();

rollback;