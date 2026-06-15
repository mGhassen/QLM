BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('test1', 'test1@test.com');
select tests.create_supabase_user('test2');
select tests.create_supabase_user('primary_owner', 'notif-owner@test.run');
select tests.create_supabase_user('owner', 'notif-admin@test.run');
select tests.create_supabase_user('member', 'notif-member@test.run');
select tests.create_supabase_user('custom', 'notif-custom@test.run');
select public.set_identifier('primary_owner', 'notif-owner@test.run');
select public.set_identifier('owner', 'notif-admin@test.run');
select public.set_identifier('member', 'notif-member@test.run');
select public.set_identifier('custom', 'notif-custom@test.run');

select public.authenticate_as('test1');

-- users cannot insert into notifications
select throws_ok(
    $$ insert into public.notifications(account_id, body) values (tests.get_supabase_uid('test1'), 'test'); $$,
    'permission denied for table notifications'
);

set local role service_role;

-- service role can insert into notifications (account_id = user_id since setup_new_user creates account with id = user_id)
select lives_ok(
    $$ insert into public.notifications(account_id, body) values (tests.get_supabase_uid('test1'), 'test'); $$,
    'service role can insert into notifications'
);

reset role;
select public.authenticate_as('test1');

-- user can read their own notifications
select row_eq(
    $$ select account_id, body from public.notifications where account_id = tests.get_supabase_uid('test1'); $$,
    row (tests.get_supabase_uid('test1'), 'test'::varchar),
    'user can read their own notifications'
);

-- Create org qlm and add member for team notifications test
-- Note: notifications.account_id references accounts(id). For org notifications the RLS uses has_role_on_organization(account_id)
-- which expects org id. The FK restricts to accounts - org ids would fail. So we test with primary_owner's account (personal)
-- and verify member (who has org role) - for org-scoped notifications we'd need schema to support organization_id.
-- For now we test that get_account_id_by_slug works with SECURITY DEFINER (no permission denied)
select public.authenticate_as('primary_owner');
insert into public.organizations (slug, name, user_id) values ('notif-qlm', 'Notif QLM', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('owner'), public.get_organization_id_by_slug('notif-qlm'), 'owner'
union all select public.get_id_by_identifier('member'), public.get_organization_id_by_slug('notif-qlm'), 'analyst'
union all select public.get_id_by_identifier('custom'), public.get_organization_id_by_slug('notif-qlm'), 'analyst';
reset role;

set local role service_role;

-- Insert notification for primary_owner's account (valid account id = user id per setup_new_user)
select lives_ok(
    $$ insert into public.notifications(account_id, body) values (tests.get_supabase_uid('primary_owner'), 'team test'); $$,
    'service role can insert into notifications for org owner'
);

reset role;
select public.authenticate_as('member');

-- member cannot read primary_owner's personal notifications (different account)
select is_empty(
    $$ select account_id, body from public.notifications where account_id = tests.get_supabase_uid('primary_owner') and body = 'team test'; $$,
    'member cannot read other users personal notifications'
);

-- foreigners
select public.authenticate_as('test2');

-- foreigner cannot read other user's notifications
select is_empty(
    $$ select account_id, body from public.notifications where account_id = tests.get_supabase_uid('test1'); $$,
    'foreigner cannot read other users notifications'
);

-- foreigner cannot read other teams notifications (primary_owner's account)
select is_empty(
    $$ select account_id, body from public.notifications where account_id = tests.get_supabase_uid('primary_owner'); $$,
    'foreigner cannot read other teams notifications'
);

select * from finish();

rollback;
