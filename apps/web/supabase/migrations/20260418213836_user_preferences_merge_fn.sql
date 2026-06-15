-- Adds atomic-merge RPC for user_preferences. Matches
-- apps/web/supabase/schemas/44-user-preferences-merge-fn.sql.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.merge_user_preferences(p_patch jsonb)
 RETURNS public.user_preferences
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  resulting public.user_preferences;
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'merge_user_preferences: no authenticated user';
  end if;

  insert into public.user_preferences as up (user_id, preferences)
  values (caller_id, coalesce(p_patch, '{}'::jsonb))
  on conflict (user_id) do update
    set preferences = up.preferences || coalesce(excluded.preferences, '{}'::jsonb)
  returning * into resulting;

  return resulting;
end;
$function$;

comment on function public.merge_user_preferences(jsonb) is
  'Atomic upsert-with-merge on public.user_preferences. Patch is shallow-merged (`||`) into existing preferences; new rows initialised to the patch. RLS still applies via SECURITY INVOKER.';

revoke all on function public.merge_user_preferences(jsonb) from public;
grant execute on function public.merge_user_preferences(jsonb) to authenticated;
