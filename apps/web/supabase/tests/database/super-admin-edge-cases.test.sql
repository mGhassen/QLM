begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

-- Create test users for different scenarios
select tests.create_supabase_user('transitioning_admin');
select tests.create_supabase_user('revoking_mfa_admin');
select tests.create_supabase_user('concurrent_session_user');

-- Set up test users
select public.set_identifier('transitioning_admin', 'transitioning@qlm.dev');
select public.set_identifier('revoking_mfa_admin', 'revoking@qlm.dev');
select public.set_identifier('concurrent_session_user', 'concurrent@qlm.dev');

-- Test 1: Role Transition Scenarios
select public.authenticate_as('transitioning_admin');
select public.set_mfa_factor();
select public.set_session_aal('aal2');

-- Initially not a super admin
select is(
    (select public.is_super_admin()),
    false,
    'User should not be super admin initially'
);

-- Grant super admin
select public.set_super_admin();

select is(
    (select public.is_super_admin()),
    true,
    'User should now be super admin'
);

-- Test 2: MFA Revocation Scenarios
select public.authenticate_as('revoking_mfa_admin');
select public.set_mfa_factor();
select public.set_session_aal('aal2');
select public.set_super_admin();

-- Initially has super admin access
select is(
    (select public.is_super_admin()),
    true,
    'Admin should have super admin access initially'
);

-- Simulate MFA revocation by setting AAL1
select public.set_session_aal('aal1');

select is(
    (select public.is_super_admin()),
    false,
    'Admin should lose super admin access when MFA is revoked'
);

-- Test 3: Concurrent Session Management
select public.authenticate_as('concurrent_session_user');
select public.set_mfa_factor();
select public.set_session_aal('aal2');
select public.set_super_admin();

-- Test access with AAL2
select is(
    (select public.is_super_admin()),
    true,
    'Should have super admin access with AAL2'
);

-- Simulate different session with AAL1
select public.set_session_aal('aal1');

select is(
    (select public.is_super_admin()),
    false,
    'Should not have super admin access with AAL1 even if other session has AAL2'
);

-- Finish the tests and clean up
select * from finish();

rollback;