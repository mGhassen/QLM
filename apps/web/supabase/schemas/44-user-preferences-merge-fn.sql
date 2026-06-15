/*
 * -------------------------------------------------------
 * Section: User Preferences — atomic merge RPC
 * Supabase JS `.upsert()` replaces JSONB columns instead of
 * merging them, which would let concurrent `PATCH` requests
 * clobber each other's keys (e.g. two orgs writing
 * `last_project_by_org` at the same time). This helper does
 * a single-statement upsert with `preferences || EXCLUDED.preferences`
 * so the server-side merge is atomic.
 *
 * `security invoker` means the function runs as the calling
 * user — RLS on `public.user_preferences` still enforces the
 * `user_id = auth.uid()` check on INSERT and UPDATE paths.
 *
 * Callers: `SupabaseUserPreferencesRepository.patch(...)` (Story 005).
 * See docs/specs/0024-global-shell-ui-phase1.md §5.2, §6.1.
 * -------------------------------------------------------
 */

create or replace function public.merge_user_preferences(p_patch jsonb)
returns public.user_preferences
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

comment on function public.merge_user_preferences(jsonb) is
  'Atomic upsert-with-merge on public.user_preferences. Patch is shallow-merged (`||`) into existing preferences; new rows initialised to the patch. RLS still applies via SECURITY INVOKER.';

revoke all on function public.merge_user_preferences(jsonb) from public;
grant execute on function public.merge_user_preferences(jsonb) to authenticated;
