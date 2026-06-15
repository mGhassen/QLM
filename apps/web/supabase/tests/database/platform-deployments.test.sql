BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('plat_dep_owner', 'plat_dep_owner@test.com');
select tests.create_supabase_user('plat_dep_stranger', 'plat_dep_stranger@test.com');
select public.set_identifier('plat_dep_owner', 'plat_dep_owner@test.com');
select public.set_identifier('plat_dep_stranger', 'plat_dep_stranger@test.com');

-- ---------------------------------------------------------------------------
-- As plat_dep_owner: create the whole deployment hierarchy the platform
-- surface is scoped to — deployment_request → data_snapshot + data_clone +
-- branch + compute, with a db_role linked via deployment_request.db_user_id.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_dep_owner');

-- Insert the db_role FIRST (before other inserts) to isolate ordering effects.
insert into public.db_role (username, password, status)
values ('owner-dbuser', 'pw', 'CREATED')
returning id \gset dbrole_

-- Seed a performance_profile owned by the owner (compute needs one).
insert into public.performance_profile (account_id, label_name, database_provider, database_version, is_active)
values ((select id from public.accounts where user_id = auth.uid()), 'dep-owner-profile', 'postgres', '16', true)
returning id \gset profile_

insert into public.deployment_request (name, fqdn, repository_name, database_provider, account_id, deployment_type)
values ('dep-owner-1', 'dep-owner-1.local', 'repo-a', 'postgres',
        (select id from public.accounts where user_id = auth.uid()),
        'REPOSITORY')
returning id \gset deployment_

insert into public.data_snapshot (account_id, deployment_id, status)
values ((select id from public.accounts where user_id = auth.uid()), :'deployment_id', 'CREATED')
returning id \gset snapshot_

insert into public.data_clone (name, account_id, snapshot_id, status)
values ('clone-owner-1',
        (select id from public.accounts where user_id = auth.uid()),
        :'snapshot_id', 'CREATED');

insert into public.branch (account_id, deployment_id, snapshot_id, label_name, job_status)
values ((select id from public.accounts where user_id = auth.uid()),
        :'deployment_id', :'snapshot_id', 'branch-owner-1', 'CREATED')
returning id \gset branch_

insert into public.compute (account_id, label_name, job_status, deployment_id, branch_id, performance_profile_id)
values ((select id from public.accounts where user_id = auth.uid()),
        'compute-owner-1', 'CREATED', :'deployment_id', :'branch_id', :'profile_id');

update public.deployment_request set db_user_id = :'dbrole_id' where id = :'deployment_id';

-- ---------------------------------------------------------------------------
-- Owner-side read assertions: all rows visible to owner.
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.deployment_request where name = 'dep-owner-1'), 1, 'owner sees deployment_request');
select is((select count(*)::int from public.data_snapshot where id = (select id from public.data_snapshot where deployment_id = :'deployment_id' limit 1)), 1, 'owner sees data_snapshot');
select is((select count(*)::int from public.data_clone where name = 'clone-owner-1'), 1, 'owner sees data_clone');
select is((select count(*)::int from public.branch where label_name = 'branch-owner-1'), 1, 'owner sees branch');
select is((select count(*)::int from public.compute where label_name = 'compute-owner-1'), 1, 'owner sees compute');
select is((select count(*)::int from public.db_role where id = :'dbrole_id'), 1, 'owner sees linked db_role');

-- ---------------------------------------------------------------------------
-- As plat_dep_stranger: sees NOTHING from the owner's deployment hierarchy.
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_dep_stranger');

select is((select count(*)::int from public.deployment_request where name = 'dep-owner-1'), 0, 'stranger cannot see owner''s deployment_request');
select is((select count(*)::int from public.data_snapshot where deployment_id = :'deployment_id'), 0, 'stranger cannot see owner''s data_snapshot');
select is((select count(*)::int from public.data_clone where name = 'clone-owner-1'), 0, 'stranger cannot see owner''s data_clone');
select is((select count(*)::int from public.branch where label_name = 'branch-owner-1'), 0, 'stranger cannot see owner''s branch');
select is((select count(*)::int from public.compute where label_name = 'compute-owner-1'), 0, 'stranger cannot see owner''s compute');
select is((select count(*)::int from public.db_role where id = :'dbrole_id'), 0, 'stranger cannot see owner''s linked db_role');

-- Stranger attempting to insert into owner's deployment is rejected.
select throws_ok(
  $$ insert into public.data_snapshot (account_id, deployment_id, status)
     values ((select id from public.accounts where user_id = auth.uid()), '$$ || :'deployment_id' || $$', 'INIT') $$,
  'new row violates row-level security policy for table "data_snapshot"'
);

-- Stranger attempting to INSERT a deployment with a fake account_id pointing
-- at the owner — rejected, the account_id must be is_account_owner(auth.uid()).
select throws_ok(
  $$ insert into public.deployment_request (name, fqdn, repository_name, database_provider, account_id, deployment_type)
     values ('stranger-forge', 'stranger-forge.local', 'repo-s', 'postgres',
             (select id from public.accounts where user_id = public.get_id_by_identifier('plat_dep_owner')),
             'REPOSITORY') $$,
  'new row violates row-level security policy for table "deployment_request"'
);

select * from finish();
ROLLBACK;
