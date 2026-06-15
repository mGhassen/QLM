BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('plat_st_owner', 'plat_st_owner@test.com');
select tests.create_supabase_user('plat_st_stranger', 'plat_st_stranger@test.com');
select public.set_identifier('plat_st_owner', 'plat_st_owner@test.com');
select public.set_identifier('plat_st_stranger', 'plat_st_stranger@test.com');

-- ---------------------------------------------------------------------------
-- As service_role: seed a global catalog entry (for deployment_settings_catalog)
-- and a global resources row.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into public.deployment_settings_catalog (setting_name, setting_type, default_value, description)
values ('max_connections', 'integer', '100', 'Max DB connections');

insert into public.resources (account_id, resource_type, resource_unit, resource_value)
values (null, 'cpu_limit', 'cores', 16);

reset role;

-- ---------------------------------------------------------------------------
-- As plat_st_owner: create a user_tokens row, a deployment_request, and a
-- per-account resources row. Also read globals.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_st_owner');

-- user_tokens: owner inserts and reads.
insert into public.user_tokens (account_id, token_name, scopes, expires_at)
values ((select id from public.accounts where user_id = auth.uid()),
        'owner-token', '["read"]'::jsonb, 9999999999);

select is(
  (select count(*)::int from public.user_tokens where token_name = 'owner-token'),
  1,
  'owner sees their user_tokens row'
);

-- deployment_settings_catalog: read-open, writes rejected.
select is(
  (select count(*)::int from public.deployment_settings_catalog where setting_name = 'max_connections'),
  1,
  'authenticated user can SELECT the catalog entry'
);

select throws_ok(
  $$ insert into public.deployment_settings_catalog (setting_name, default_value)
     values ('shmem', '256MB') $$,
  'permission denied for table deployment_settings_catalog'
);

-- deployment_settings via a real deployment. The `create_deployment_settings`
-- trigger on deployment_request INSERT auto-fans catalog rows into
-- deployment_settings — no manual INSERT needed.
insert into public.deployment_request (name, fqdn, repository_name, database_provider, account_id, deployment_type)
values ('dep-st', 'dep-st.local', 'repo', 'postgres',
        (select id from public.accounts where user_id = auth.uid()),
        'REPOSITORY')
returning id as deployment_id \gset dep_

select is(
  (select count(*)::int from public.deployment_settings where deployment_id = :'dep_deployment_id'),
  1,
  'trigger auto-created a deployment_settings row from the global catalog'
);

-- Owner can update the setting value.
update public.deployment_settings set setting_value = '500' where deployment_id = :'dep_deployment_id';

select is(
  (select setting_value from public.deployment_settings where deployment_id = :'dep_deployment_id'),
  '500',
  'owner can UPDATE their deployment_settings row'
);

-- resources: owner reads global + per-account.
insert into public.resources (account_id, resource_type, resource_unit, resource_value)
values ((select id from public.accounts where user_id = auth.uid()), 'custom', 'units', 42);

select is(
  (select count(*)::int from public.resources where resource_type in ('cpu_limit', 'custom')),
  2,
  'owner sees both the global resources row and their own'
);

-- ---------------------------------------------------------------------------
-- As plat_st_stranger: cannot see owner's user_tokens, deployment_settings,
-- or per-account resources. CAN see global catalog entries + global resources.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_st_stranger');

select is(
  (select count(*)::int from public.user_tokens where token_name = 'owner-token'),
  0,
  'stranger cannot see owner''s user_tokens'
);

select is(
  (select count(*)::int from public.deployment_settings_catalog where setting_name = 'max_connections'),
  1,
  'stranger CAN see the global catalog (read-open)'
);

select is(
  (select count(*)::int from public.deployment_settings where deployment_id = :'dep_deployment_id'),
  0,
  'stranger cannot see owner''s deployment_settings'
);

select is(
  (select count(*)::int from public.resources where resource_type = 'cpu_limit'),
  1,
  'stranger sees the global resources row (account_id IS NULL)'
);

select is(
  (select count(*)::int from public.resources where resource_type = 'custom'),
  0,
  'stranger does not see owner''s per-account resources row'
);

select * from finish();
ROLLBACK;
