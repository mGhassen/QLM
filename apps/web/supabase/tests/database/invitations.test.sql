begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('invite_test', 'invite_test@rasm.ai');
select tests.create_supabase_user('invite_member', 'invite_member@rasm.ai');
select tests.create_supabase_user('invite_custom', 'invite_custom@rasm.ai');
select tests.create_supabase_user('invite_owner', 'invite_owner@rasm.ai');
select public.set_identifier('invite_test', 'invite_test@rasm.ai');
select public.set_identifier('invite_member', 'invite_member@rasm.ai');
select public.set_identifier('invite_custom', 'invite_custom@rasm.ai');
select public.set_identifier('invite_owner', 'invite_owner@rasm.ai');

select public.authenticate_as('invite_test');

insert into public.organizations (slug, name, user_id) values ('invite-org-rasm', 'Rasm', auth.uid());

set local role postgres;
insert into public.organization_memberships (user_id, organization_id, account_role)
select public.get_id_by_identifier('invite_owner'), public.get_organization_id_by_slug('invite-org-rasm'), 'owner'
union all select public.get_id_by_identifier('invite_member'), public.get_organization_id_by_slug('invite-org-rasm'), 'administrator'
union all select public.get_id_by_identifier('invite_custom'), public.get_organization_id_by_slug('invite-org-rasm'), 'administrator';
reset role;

select public.authenticate_as('invite_test');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite1@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()); $$,
'owner should be able to create invitations'
);

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite1@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()) $$,
    'duplicate key value violates unique constraint "invitations_email_organization_id_key"'
);

select public.authenticate_as('invite_member');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite2@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite2@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()); $$,
    'administrator should be able to create invitations for analyst or lower roles'
);

select isnt_empty(
    $$ select * from public.invitations where organization_id = public.get_organization_id_by_slug('invite-org-rasm') $$,
    'invitations should be listed'
);

select public.authenticate_as('invite_owner');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite3@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()); $$,
    'owner should be able to create invitations'
);

select public.authenticate_as('invite_custom');

-- Administrator cannot invite owner (higher role)
select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite3-owner-blocked@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select public.authenticate_as('invite_custom');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('invite4@rasm.ai', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()); $$,
    'administrator should be able to create invitations'
);

select lives_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-rasm', ARRAY[ROW('example@rasm.ai', 'analyst')::public.invitation]); $$,
    'administrator should be able to create invitations using add_invitations_to_organization'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-rasm', ARRAY[ROW('reject-owner-admin-cannot-invite@rasm.ai', 'owner')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"',
    'cannot invite members with higher roles'
);

select tests.create_supabase_user('user');
select public.authenticate_as('user');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, organization_id, role, invite_token) values ('foreign@example.com', auth.uid(), public.get_organization_id_by_slug('invite-org-rasm'), 'analyst', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_organization('invite-org-rasm', ARRAY[ROW('foreign2@example.com', 'analyst')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"'
);

select is_empty($$
    select * from public.invitations where organization_id = public.get_organization_id_by_slug('invite-org-rasm') $$,
    'no invitations should be listed'
);

select * from finish();

rollback;