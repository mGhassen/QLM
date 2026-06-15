create or replace function public.get_account_names_for_users (user_ids uuid[]) returns table (
  user_id uuid,
  name varchar(255)
) language plpgsql security definer
set search_path = '' as $$
begin
  return QUERY
  select
    acc.user_id,
    acc.name
  from
    public.accounts acc
  where
    acc.user_id = any(user_ids)
    and (
      -- User's own account
      acc.user_id = auth.uid()
      -- Or user shares an organization with the account owner
      or public.share_organization_with_user(acc.user_id)
    );
end;
$$;

grant execute on function public.get_account_names_for_users (uuid[]) to authenticated, service_role;
