begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('primary_owner', 'transfer-owner@test.run');
select tests.create_supabase_user('owner', 'transfer-admin@test.run');
select tests.create_supabase_user('member', 'transfer-member@test.run');
select tests.create_supabase_user('custom', 'transfer-custom@test.run');
select public.set_identifier('primary_owner', 'transfer-owner@test.run');
select public.set_identifier('owner', 'transfer-admin@test.run');
select public.set_identifier('member', 'transfer-member@test.run');
select public.set_identifier('custom', 'transfer-custom@test.run');

select tests.create_supabase_user('test', 'test@supabase.com');
select public.set_identifier('test', 'test@supabase.com');

select public.authenticate_as('primary_owner');
insert into public.organizations (slug, name, user_id) values ('transfer-rasm', 'Transfer Rasm', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('owner'), public.get_organization_id_by_slug('transfer-rasm'), 'owner'
union all select public.get_id_by_identifier('member'), public.get_organization_id_by_slug('transfer-rasm'), 'analyst'
union all select public.get_id_by_identifier('custom'), public.get_organization_id_by_slug('transfer-rasm'), 'analyst';
reset role;

select public.authenticate_as('primary_owner');

-- only the service role can transfer ownership
-- authenticated users get permission error or custom exception
select throws_matching(
    $$ select public.transfer_organization_ownership(
        public.get_organization_id_by_slug('transfer-rasm'),
        tests.get_supabase_uid('custom')
    ) $$,
    'permission|member',
    'authenticated users cannot transfer ownership'
);

set local role service_role;
-- Clear JWT so transfer_organization_ownership allows service_role (JWT would have 'authenticated' from previous authenticate_as)
perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- the new owner must be a member of the organization so this should fail
select throws_ok(
    $$ select public.transfer_organization_ownership(
        public.get_organization_id_by_slug('transfer-rasm'),
        tests.get_supabase_uid('test')
    ) $$,
    'The new owner must be a member of the organization'
);

-- this should work because the user is a member of the organization
select lives_ok(
    $$ select public.transfer_organization_ownership(
        public.get_organization_id_by_slug('transfer-rasm'),
        tests.get_supabase_uid('owner')
    ) $$
);

-- check the organization owner has been updated (use postgres to bypass RLS)
set local role postgres;
select row_eq(
    $$ select user_id from public.organizations where id = (select id from public.organizations where slug = 'transfer-rasm') $$,
    row(tests.get_supabase_uid('owner')),
    'The organization owner should be updated'
);
set local role service_role;

-- when transferring ownership to an account with a lower role
-- the membership will also be updated to the owner role
select lives_ok(
    $$ select public.transfer_organization_ownership(
        public.get_organization_id_by_slug('transfer-rasm'),
        tests.get_supabase_uid('member')
    ) $$
);

-- check the organization owner and membership role have been updated (use postgres to bypass RLS)
set local role postgres;
select row_eq(
    $$ select account_role from public.organization_memberships
       where organization_id = (select id from public.organizations where slug = 'transfer-rasm')
       and user_id = tests.get_supabase_uid('member');
    $$,
    row('owner'::varchar),
    'The member should now have owner role after ownership transfer'
);

select * from finish();

rollback;
