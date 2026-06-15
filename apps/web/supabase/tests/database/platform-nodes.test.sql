BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

-- Two users, each with an auto-created personal account.
select tests.create_supabase_user('plat_node_owner', 'plat_node_owner@test.com');
select tests.create_supabase_user('plat_node_stranger', 'plat_node_stranger@test.com');
select public.set_identifier('plat_node_owner', 'plat_node_owner@test.com');
select public.set_identifier('plat_node_stranger', 'plat_node_stranger@test.com');

-- ---------------------------------------------------------------------------
-- As service_role (postgres), seed one public-pool node and one per-account
-- node owned by plat_node_owner.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into public.node (id, label_name, account_id, node_type, node_pool, datacenter, region, hosting_provider, memory, cpu, storage)
values
  (gen_random_uuid(), 'public-node-1', null, 'public', 'pool-a', 'us-east-1', 'us', 'AWS', 16, 4, 100),
  (gen_random_uuid(), 'owner-node-1', public.get_id_by_identifier('plat_node_owner'), 'private', 'pool-b', 'us-east-1', 'us', 'AWS', 32, 8, 200);
-- Note: node.account_id FKs public.accounts(id), not auth.users(id). But the
-- auto-created account shares the user id via `default auth.uid()` only when
-- the session is authenticated. When inserting as postgres we resolve the
-- account id explicitly.
-- Repair the inserted owner-node to reference the real account row:
update public.node
  set account_id = (select id from public.accounts where user_id = public.get_id_by_identifier('plat_node_owner'))
  where label_name = 'owner-node-1';

reset role;

-- ---------------------------------------------------------------------------
-- As plat_node_owner: can SELECT the public node AND the own node. Writes are
-- revoked for authenticated on node (grant is SELECT-only).
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_node_owner');

select is(
  (select count(*)::int from public.node where label_name in ('public-node-1', 'owner-node-1')),
  2,
  'owner sees both the public node and their own private node'
);

select throws_ok(
  $$ insert into public.node (label_name, node_type, node_pool, datacenter, region, hosting_provider, memory, cpu, storage)
     values ('owner-attempt', 'private', 'pool-x', 'us-east-1', 'us', 'AWS', 8, 2, 50) $$,
  'permission denied for table node'
);

-- ---------------------------------------------------------------------------
-- As plat_node_stranger: sees only the public node (RLS filters the
-- private one).
-- ---------------------------------------------------------------------------
select public.authenticate_as('plat_node_stranger');

select is(
  (select count(*)::int from public.node where label_name in ('public-node-1', 'owner-node-1')),
  1,
  'stranger sees only the public-pool node, not the owner''s private node'
);

select is(
  (select label_name from public.node where label_name in ('public-node-1', 'owner-node-1')),
  'public-node-1',
  'the visible row is the public-pool node'
);

select * from finish();
ROLLBACK;
