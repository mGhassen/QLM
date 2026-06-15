begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select tests.create_supabase_user('primary_owner', 'storage-owner@test.run');
select tests.create_supabase_user('owner', 'storage-admin@test.run');
select tests.create_supabase_user('member', 'storage-member@test.run');
select tests.create_supabase_user('custom', 'storage-custom@test.run');
select public.set_identifier('primary_owner', 'storage-owner@test.run');
select public.set_identifier('owner', 'storage-admin@test.run');
select public.set_identifier('member', 'storage-member@test.run');
select public.set_identifier('custom', 'storage-custom@test.run');

select public.authenticate_as('member');

select throws_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('account_image', '{"key": "value"}', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'new row violates row-level security policy for table "objects"'
);

select public.authenticate_as('primary_owner');

-- Ensure account_image bucket exists (may not be in migrations)
set local role postgres;
insert into storage.buckets (id, name, public) values ('account_image', 'account_image', true)
on conflict (id) do nothing;
reset role;

select lives_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('account_image', '{"key": "value"}', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'The owner should be able to insert a new object'
);

select isnt_empty(
    $$ select * from storage.objects where owner = tests.get_supabase_uid('primary_owner') $$,
    'The object should be inserted'
);

select public.authenticate_as('owner');

select is_empty(
    $$ select * from storage.objects where owner = tests.get_supabase_uid('primary_owner') $$,
    'The owner should not be able to see the object'
);

-- create a new bucket
--
set local role postgres;

select lives_ok(
    $$ insert into storage.buckets ("name", "id", public) values ('new_bucket', 'new_bucket', true); $$
);

-- we create a mock policy allowing only the primary_owner to access the new bucket
-- this is a mock policy to check the existing policy system does not interfere with the new bucket
create policy new_bucket_policy on storage.objects for all using (
  bucket_id = 'new_bucket'
  and auth.uid() = tests.get_supabase_uid('primary_owner')
)
with check (
  bucket_id = 'new_bucket'
  and auth.uid() = tests.get_supabase_uid('primary_owner')
);

select public.authenticate_as('member');

-- user should not be able to insert into the new bucket according to the new policy
select throws_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('new_bucket', '{"key": "value"}', 'some name', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'new row violates row-level security policy for table "objects"'
);

select public.authenticate_as('primary_owner');

-- primary_owner should be able to insert into the new bucket according to the new policy
-- this is to check the new policy system is working
--
select lives_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('new_bucket', '{"key": "value"}', 'some name', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'primary_owner should be able to insert into the new bucket'
);

set local role postgres;

-- create a new bucket with a custom policy
--
create policy new_custom_bucket_policy on storage.objects for all using (
  bucket_id = 'new_bucket'
  and auth.uid() = tests.get_supabase_uid('owner')
)
with check (
  bucket_id = 'new_bucket'
  and auth.uid() = tests.get_supabase_uid('owner')
);

select public.authenticate_as('owner');

-- insert a new object into the new bucket
--
select lives_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('new_bucket', '{"key": "value"}', 'some name 2', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'The primary_owner should be able to insert a new object into the new bucket'
);

-- check the object is inserted
--
select isnt_empty(
    $$ select * from storage.objects where bucket_id = 'new_bucket' $$,
    'The object should be inserted into the new bucket'
);

-- check other members cannot insert into the new bucket
select public.authenticate_as('member');

select throws_ok(
    $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version") values
        ('new_bucket', '{"key": "value"}', 'some other name', tests.get_supabase_uid('primary_owner'), tests.get_supabase_uid('primary_owner'), 1); $$,
        'new row violates row-level security policy for table "objects"'
);

select
  *
from
  finish();

rollback;