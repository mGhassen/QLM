BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('plat_ip_owner', 'plat_ip_owner@test.com');
select tests.create_supabase_user('plat_ip_stranger', 'plat_ip_stranger@test.com');
select public.set_identifier('plat_ip_owner', 'plat_ip_owner@test.com');
select public.set_identifier('plat_ip_stranger', 'plat_ip_stranger@test.com');

-- ---------------------------------------------------------------------------
-- As service_role: seed a catalog row + a public image_provider assignment.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into public.image_provider_catalog (id, database_provider, database_version, volume_path, log_path, image_name, default_port, user_uid, user_gid)
values (gen_random_uuid(), 'postgres', '16', '/var/lib/postgresql/data', '/var/log/postgresql', 'postgres:16', 5432, 999, 999)
returning id \gset catalog_

insert into public.image_provider (account_id, image_provider_id, is_active, is_default)
values (null, :'catalog_id', true, true);

reset role;

-- ---------------------------------------------------------------------------
-- image_provider_catalog: authenticated users can SELECT, cannot write.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_ip_owner');

select is(
  (select count(*)::int from public.image_provider_catalog where image_name = 'postgres:16'),
  1,
  'authenticated user can read the image_provider_catalog row'
);

select throws_ok(
  $$ insert into public.image_provider_catalog (database_provider, database_version, volume_path, log_path, image_name, default_port, user_uid, user_gid)
     values ('mysql', '8.0', '/var/lib/mysql', '/var/log/mysql', 'mysql:8.0', 3306, 999, 999) $$,
  'permission denied for table image_provider_catalog'
);

-- ---------------------------------------------------------------------------
-- image_provider: owner sees public rows + own rows; stranger only sees
-- public rows. Owner can create own rows but not public ones.
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.image_provider where image_provider_id = :'catalog_id'),
  1,
  'owner sees the public image_provider assignment'
);

select lives_ok(
  $$ insert into public.image_provider (account_id, image_provider_id, is_active, is_default)
     values ((select id from public.accounts where user_id = auth.uid()), '$$ || :'catalog_id' || $$', true, false) $$,
  'owner can insert an image_provider with their own account_id'
);

-- Stranger view: sees the public row, not the owner's private row.
select public.authenticate_as('plat_ip_stranger');

select is(
  (select count(*)::int from public.image_provider where image_provider_id = :'catalog_id' and account_id is null),
  1,
  'stranger sees the public (account_id IS NULL) image_provider row'
);

select is(
  (select count(*)::int from public.image_provider where image_provider_id = :'catalog_id' and account_id is not null),
  0,
  'stranger does NOT see the owner''s private image_provider row'
);

-- Stranger attempt to create a public assignment — rejected.
select throws_ok(
  $$ insert into public.image_provider (account_id, image_provider_id, is_active, is_default)
     values (null, '$$ || :'catalog_id' || $$', true, false) $$,
  'new row violates row-level security policy for table "image_provider"'
);

select * from finish();
ROLLBACK;
