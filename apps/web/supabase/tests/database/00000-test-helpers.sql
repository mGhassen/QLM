
create or replace function public.get_id_by_identifier(   
  identifier text
)
  returns uuid
  security definer
  set search_path = auth, pg_temp
  as $$
begin

  return (select id from auth.users where raw_user_meta_data->>'test_identifier' = identifier);

end;

$$ language PLPGSQL;

create or replace function public.set_identifier(
    identifier text,
    user_email text
)
    returns text
    security definer
    set search_path = auth, pg_temp
as
$$
begin
    update auth.users
    set raw_user_meta_data = jsonb_build_object('test_identifier', identifier)
    where email = user_email;

    return identifier;

end;

$$ language PLPGSQL;

create or replace function public.get_organization_id_by_slug(org_slug text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from public.organizations where slug = org_slug;
$$;

create or replace function public.get_organization_by_slug(org_slug text)
returns setof public.organizations
language sql
set search_path = ''
as $$
  select * from public.organizations where slug = org_slug;
$$;

create or replace function public.get_account_id_by_slug(account_slug text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from public.organizations where slug = account_slug;
$$;

create or replace function public.authenticate_as(
    identifier text
) returns void
as
$$
begin
    perform tests.authenticate_as(identifier);
    perform public.set_session_aal('aal1');
end;
$$ language plpgsql;

create or replace function public.set_mfa_factor(
    identifier text = gen_random_uuid()
)
    returns void
as
$$
begin
    insert into "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret")
    values (gen_random_uuid(), auth.uid(), identifier, 'totp', 'verified', '2025-02-24 09:48:18.402031+00', '2025-02-24 09:48:18.402031+00',
            'HOWQFBA7KBDDRSBNMGFYZAFNPRSZ62I5');
end;
$$ language plpgsql security definer;

create or replace function public.set_session_aal(session_aal auth.aal_level)
    returns void
as
$$
begin
    perform set_config('request.jwt.claims', json_build_object(
            'sub', current_setting('request.jwt.claims')::json ->> 'sub',
            'email', current_setting('request.jwt.claims')::json ->> 'email',
            'phone', current_setting('request.jwt.claims')::json ->> 'phone',
            'user_metadata', current_setting('request.jwt.claims')::json ->> 'user_metadata',
            'app_metadata', current_setting('request.jwt.claims')::json ->> 'app_metadata',
            'aal', session_aal)::text, true);
end;
$$ language plpgsql;

create or replace function public.set_super_admin() returns void
as
$$
begin
    perform set_config('request.jwt.claims', json_build_object(
            'sub', current_setting('request.jwt.claims')::json ->> 'sub',
            'email', current_setting('request.jwt.claims')::json ->> 'email',
            'phone', current_setting('request.jwt.claims')::json ->> 'phone',
            'user_metadata', current_setting('request.jwt.claims')::json ->> 'user_metadata',
            'app_metadata', json_build_object('role', 'super-admin'),
            'aal', current_setting('request.jwt.claims')::json ->> 'aal'
        )::text, true);
end;
$$ language plpgsql;

begin;

select plan(1);

select is_empty($$
  select * from public.get_organization_by_slug('test') $$,
  'get_organization_by_slug should return an empty set when the organization does not exist'
       );

select *
from
    finish();

rollback;