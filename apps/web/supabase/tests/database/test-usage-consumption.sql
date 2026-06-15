begin;

create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

-- Create test users and org
select tests.create_supabase_user('primary_owner', 'usage-owner@test.run');
select tests.create_supabase_user('member', 'usage-analyst@test.run');
select public.set_identifier('primary_owner', 'usage-owner@test.run');
select public.set_identifier('owner', 'usage-owner@test.run');
select public.set_identifier('member', 'usage-analyst@test.run');

select public.authenticate_as('owner');
insert into public.organizations (id, slug, name, user_id) values (
  'a0000001-0001-0001-0001-000000000001'::uuid,
  'usage-consumption-org',
  'Usage Consumption Org',
  auth.uid()
);

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('member'), 'a0000001-0001-0001-0001-000000000001'::uuid, 'analyst';
reset role;

-- Create project and conversation
select public.authenticate_as('owner');
insert into public.projects (id, organization_id, slug, name) values (
  'a0000001-0001-0001-0001-000000000002'::uuid,
  'a0000001-0001-0001-0001-000000000001'::uuid,
  'usage-test-project',
  'Usage Test Project'
);

insert into public.conversations (id, project_id, slug, title, task_id, created_by, is_public) values (
  'a0000001-0001-0001-0001-000000000003'::uuid,
  'a0000001-0001-0001-0001-000000000002'::uuid,
  'test-consumption-conv',
  'Test consumption conversation',
  'test-task',
  auth.uid(),
  false
);

set role service_role;

-- Add credits to the organization
select public.add_credits_to_organization(
  'a0000001-0001-0001-0001-000000000001'::uuid,
  1000,
  null,
  'Test credits for consumption'
);

-- Verify credits were added
set role authenticated;
select public.authenticate_as('owner');
select ok(
  (select credits_balance from public.organizations where id = 'a0000001-0001-0001-0001-000000000001') >= 1000,
  'Organization should have at least 1000 credits after purchase'
);
set role service_role;

-- Create a usage record; trigger_on_usage_consumption automatically consumes credits
insert into public.usage (
  conversation_id,
  project_id,
  organization_id,
  user_id,
  model,
  input_tokens,
  output_tokens,
  total_tokens,
  credits_used
) values (
  'a0000001-0001-0001-0001-000000000003'::uuid,
  'a0000001-0001-0001-0001-000000000002'::uuid,
  'a0000001-0001-0001-0001-000000000001'::uuid,
  public.get_id_by_identifier('owner'),
  'gpt-4',
  100,
  50,
  150,
  50
);

-- Verify consumption transaction was created (filter by our org and conversation's usage)
select row_eq(
  $$ select count(*) from public.credits_transactions ct
     join public.usage u on ct.usage_id = u.id
     where ct.organization_id = 'a0000001-0001-0001-0001-000000000001'
     and ct.transaction_type = 'consumption'
     and u.conversation_id = 'a0000001-0001-0001-0001-000000000003' $$,
  row(1::bigint),
  'Should have one consumption transaction'
);

-- Verify organization balance decreased and total consumed increased by 50
set role authenticated;
select public.authenticate_as('owner');
select ok(
  (select credits_total_consumed from public.organizations where id = 'a0000001-0001-0001-0001-000000000001') >= 50,
  'Organization credits_total_consumed should reflect the 50 credits consumed'
);
set role service_role;

-- Verify consumption transaction details (filter by our usage)
select row_eq(
  $$ select ct.credits_amount, ct.consumption_type, ct.consumption_amount
     from public.credits_transactions ct
     join public.usage u on ct.usage_id = u.id
     where ct.organization_id = 'a0000001-0001-0001-0001-000000000001'
     and ct.transaction_type = 'consumption'
     and u.conversation_id = 'a0000001-0001-0001-0001-000000000003' limit 1 $$,
  row(-50::integer, 'tokens'::text, 150::numeric),
  'Consumption transaction should have correct amount and type'
);

-- RLS: Member can read credits_transactions for their organization
set role authenticated;
select public.authenticate_as('member');

select isnt_empty(
  $$ select 1 from public.credits_transactions
     where organization_id = 'a0000001-0001-0001-0001-000000000001'
     and transaction_type = 'consumption' $$,
  'Organization member can read consumption transactions'
);

-- RLS: Foreigner cannot read other organization's consumption
select tests.create_supabase_user('foreigner');
select public.authenticate_as('foreigner');

select is_empty(
  $$ select 1 from public.credits_transactions
     where organization_id = 'a0000001-0001-0001-0001-000000000001' $$,
  'Foreign user cannot read other organization credits transactions'
);

-- Test insufficient credits: consume more than balance should fail
set role service_role;

select throws_ok(
  $$ select public.consume_credits(
       'a0000001-0001-0001-0001-000000000001'::uuid,
       'a0000001-0001-0001-0001-000000000002'::uuid,
       public.get_id_by_identifier('owner'),
       10000,
       (select id from public.usage where conversation_id = 'a0000001-0001-0001-0001-000000000003' limit 1),
       'tokens',
       1000::numeric,
       'Should fail - insufficient credits'
     ) $$,
  null,
  null,
  'consume_credits should raise when insufficient balance'
);

select * from finish();

rollback;
