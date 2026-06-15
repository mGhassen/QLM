begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('invite_test', 'invite_test@qlm.dev');
select tests.create_supabase_user('invite_member', 'invite_member@qlm.dev');
select tests.create_supabase_user('invite_custom', 'invite_custom@qlm.dev');
select tests.create_supabase_user('invite_owner', 'invite_owner@qlm.dev');
select public.set_identifier('invite_test', 'invite_test@qlm.dev');
select public.set_identifier('invite_member', 'invite_member@qlm.dev');
select public.set_identifier('invite_custom', 'invite_custom@qlm.dev');
select public.set_identifier('invite_owner', 'invite_owner@qlm.dev');

select public.authenticate_as('invite_test');

insert into public.organizations (slug, name, user_id) values ('invite-org-qlm', 'QLM', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('invite_owner'), public.get_organization_id_by_slug('invite-org-qlm'), 'owner'
union all select public.get_id_by_identifier('invite_member'), public.get_organization_id_by_slug('invite-org-qlm'), 'administrator'
union all select public.get_id_by_identifier('invite_custom'), public.get_organization_id_by_slug('invite-org-qlm'), 'administrator';
reset role;

select public.authenticate_as('invite_test');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite1@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()); $$,
'owner should be able to create invitations'
);

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite1@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()) $$,
    'duplicate key value violates unique constraint "invitations_email_organization_id_key"'
);

select public.authenticate_as('invite_member');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite2@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite2@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()); $$,
    'administrator should be able to create invitations for analyst or lower roles'
);

select isnt_empty(
    $$ select * from public.invitations where organization_id = public.get_organization_id_by_slug('invite-org-qlm') $$,
    'invitations should be listed'
);

select public.authenticate_as('invite_owner');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite3@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()); $$,
    'owner should be able to create invitations'
);

select public.authenticate_as('invite_custom');

-- Administrator cannot invite owner (higher role)
select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite3-owner-blocked@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select public.authenticate_as('invite_custom');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite4@qlm.dev', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()); $$,
    'administrator should be able to create invitations'
);

select lives_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-qlm', ARRAY[ROW('example@qlm.dev', 'analyst')::public.invitation]); $$,
    'administrator should be able to create invitations using add_invitations_to_organization'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-qlm', ARRAY[ROW('reject-owner-admin-cannot-invite@qlm.dev', 'owner')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"',
    'cannot invite members with higher roles'
);

select tests.create_supabase_user('user');
select public.authenticate_as('user');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('foreign@example.com', auth.uid(), public.get_organization_id_by_slug('invite-org-qlm'), 'analyst', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-qlm', ARRAY[ROW('foreign2@example.com', 'analyst')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"'
);

select is_empty($$
    select * from public.invitations where organization_id = public.get_organization_id_by_slug('invite-org-qlm') $$,
    'no invitations should be listed'
);

select * from finish();

rollback;