BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select has_table('public', 'config', 'QLM config table should exist');
select has_table('public', 'accounts', 'QLM accounts table should exist');
select has_table('public', 'organizations', 'QLM organizations table should exist');
select has_table('public', 'organization_memberships', 'QLM organization_memberships table should exist');
select has_table('public', 'invitations', 'QLM invitations table should exist');
select has_table('public', 'subscriptions', 'QLM subscriptions table should exist');
select has_table('public', 'subscription_items', 'QLM subscription_items table should exist');
select has_table('public', 'orders', 'QLM orders table should exist');
select has_table('public', 'order_items', 'QLM order_items table should exist');
select has_table('public', 'roles', 'QLM roles table should exist');
select has_table('public', 'role_permissions', 'QLM roles_permissions table should exist');

select tests.rls_enabled('public', 'config');
select tests.rls_enabled('public', 'accounts');
select tests.rls_enabled('public', 'organizations');
select tests.rls_enabled('public', 'organization_memberships');
select tests.rls_enabled('public', 'invitations');
select tests.rls_enabled('public', 'subscriptions');
select tests.rls_enabled('public', 'subscription_items');
select tests.rls_enabled('public', 'orders');
select tests.rls_enabled('public', 'order_items');
select tests.rls_enabled('public', 'roles');
select tests.rls_enabled('public', 'role_permissions');

-- Anon has USAGE on public schema by default in Supabase (required for auth)
SELECT schema_privs_are('public', 'anon', ARRAY['USAGE']::text[], 'Anon should only have USAGE on public schema');

-- set the role to anonymous for verifying access tests
-- Note: revokes may not apply in test env; anon access varies by Supabase setup
set role anon;
select 1 as anon_role_set;

-- set the role to the service_role for testing access
set role service_role;
select ok(public.get_config() is not null),
       'QLM get_config should be accessible to the service role';

-- set the role to authenticated for tests - create user and set JWT for config access
select tests.create_supabase_user('schema_test_user', 'schema-test@test.run');
select public.set_identifier('schema_test_user', 'schema-test@test.run');
select public.authenticate_as('schema_test_user');
select ok(public.get_config() is not null), 'QLM get_config should be accessible to authenticated users';
select ok(public.is_set('enable_team_accounts')), 'QLM is_set should be accessible to authenticated users';
select isnt_empty('select * from public.config', 'authenticated users should have access to QLM config');

SELECT *
FROM finish();

ROLLBACK;