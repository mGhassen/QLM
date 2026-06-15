BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('plat_pp_owner', 'plat_pp_owner@test.com');
select tests.create_supabase_user('plat_pp_stranger', 'plat_pp_stranger@test.com');
select public.set_identifier('plat_pp_owner', 'plat_pp_owner@test.com');
select public.set_identifier('plat_pp_stranger', 'plat_pp_stranger@test.com');

-- ---------------------------------------------------------------------------
-- As service_role: seed one active public profile and one inactive public
-- profile. Policy: SELECT only when `account_id IS NULL AND is_active = true`
-- for public rows.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into public.performance_profile (label_name, database_provider, database_version, is_active, is_seed)
values
  ('public-active', 'postgres', '16', true, true),
  ('public-inactive', 'postgres', '15', false, true);

reset role;

-- ---------------------------------------------------------------------------
-- As plat_pp_owner: sees only the active public row. Can insert a private row
-- scoped to own account. Cannot insert with account_id IS NULL.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_pp_owner');

select is(
  (select count(*)::int from public.performance_profile where label_name like 'public-%'),
  1,
  'owner sees only the active public profile; inactive one is hidden'
);

select is(
  (select label_name from public.performance_profile where label_name like 'public-%'),
  'public-active',
  'the visible public profile is the active one'
);

select lives_ok(
  $$ insert into public.performance_profile (account_id, label_name, database_provider, database_version, is_active)
     values ((select id from public.accounts where user_id = auth.uid()), 'owner-private', 'postgres', '16', true) $$,
  'owner can insert a private profile with their own account_id'
);

select throws_ok(
  $$ insert into public.performance_profile (account_id, label_name, database_provider, database_version)
     values (null, 'attempt-public', 'postgres', '16') $$,
  'new row violates row-level security policy for table "performance_profile"'
);

-- ---------------------------------------------------------------------------
-- As plat_pp_stranger: sees the active public row but NOT the owner's private.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_pp_stranger');

select is(
  (select count(*)::int from public.performance_profile where label_name in ('owner-private', 'public-active', 'public-inactive')),
  1,
  'stranger sees only the active public row, not owner''s private nor inactive public'
);

select is(
  (select label_name from public.performance_profile where label_name like 'owner-%' or label_name like 'public-%'),
  'public-active',
  'stranger sees public-active'
);

-- RLS hides the public-active row from UPDATE because only service_role can
-- modify rows with account_id IS NULL. UPDATE is a silent no-op; verify the
-- row was not actually changed.
update public.performance_profile set is_active = false where label_name = 'public-active';
select public.authenticate_as('plat_pp_owner');
select is(
  (select is_active from public.performance_profile where label_name = 'public-active'),
  true,
  'stranger UPDATE on a public row is silently filtered by RLS — row unchanged'
);
select public.authenticate_as('plat_pp_stranger');

select is(
  (select count(*)::int from public.performance_profile where label_name = 'owner-private'),
  0,
  'stranger cannot see owner''s private profile'
);

select * from finish();
ROLLBACK;
