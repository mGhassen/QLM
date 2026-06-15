-- Revoke execute on OTP/nonce functions from authenticated and anon (only service_role should have access)
revoke execute on function public.create_nonce from authenticated, anon;
revoke execute on function public.revoke_nonce from authenticated, anon;
revoke execute on function public.cleanup_expired_nonces from authenticated, anon;
revoke execute on function public.get_nonce_status from authenticated, anon;

-- Revoke execute on config functions from anon (authenticated and service_role keep access)
revoke execute on function public.get_config() from anon;
revoke execute on function public.is_set(text) from anon;

-- Ensure upsert_subscription is only callable by service_role (webhook handler)
revoke execute on function public.upsert_subscription(uuid, varchar, text, bool, public.subscription_status, public.billing_provider, bool, varchar, timestamptz, timestamptz, jsonb, timestamptz, timestamptz) from authenticated, anon;

-- transfer_organization_ownership: only service_role can execute
revoke execute on function public.transfer_organization_ownership(uuid, uuid) from authenticated, anon;

-- transfer_organization_ownership needs SECURITY DEFINER to update organizations as service_role
create or replace function public.transfer_organization_ownership (target_organization_id uuid, new_owner_id uuid) returns void
security definer
set search_path = '' as $$
begin
    -- Only service_role can execute (enforced by revoke); postgres allowed for tests

    if not exists(
        select 1 from public.organization_memberships
        where target_organization_id = organization_id and user_id = new_owner_id) then
        raise exception 'The new owner must be a member of the organization';
    end if;

    update public.organizations set user_id = new_owner_id where id = target_organization_id;

    update public.organization_memberships
    set account_role = (public.get_upper_system_role())
    where target_organization_id = organization_id and user_id = new_owner_id
    and account_role <> (public.get_upper_system_role());
end;
$$ language plpgsql;
