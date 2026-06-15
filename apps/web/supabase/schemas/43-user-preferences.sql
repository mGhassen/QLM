/*
 * -------------------------------------------------------
 * Section: User Preferences
 * Per-user private preferences blob. Phase 1 holds the
 * `last_project_by_org` map read by the topbar dropdown
 * to land a user on their last-used project when they
 * switch organization. Schema is a single jsonb column
 * so future prefs extend the payload without a new table.
 * See RFC 0024 §8 and spec docs/specs/0024-global-shell-ui-phase1.md §6.
 * -------------------------------------------------------
 */

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

comment on table public.user_preferences is 'Per-user private preferences blob. JSONB payload validated by a Zod schema at the shell-runtime write boundary.';
comment on column public.user_preferences.user_id is 'Owning user; subject of RLS.';
comment on column public.user_preferences.preferences is 'JSONB prefs. Phase 1 shape: { "last_project_by_org": { "<orgId>": "<projectId>" } }.';

-- Enable RLS
alter table "public"."user_preferences" enable row level security;

-- Tight default permissions — only authenticated users, only on their own row.
revoke all on public.user_preferences from authenticated, service_role;
grant select, insert, update, delete on table public.user_preferences to authenticated;

-- SELECT: user can read only their own prefs row.
create policy user_preferences_read on public.user_preferences
  for select to authenticated using (
    user_id = (select auth.uid())
  );

-- INSERT: user can insert only a row keyed to their own user_id.
create policy user_preferences_insert on public.user_preferences
  for insert to authenticated with check (
    user_id = (select auth.uid())
  );

-- UPDATE: user can update only their own row; WITH CHECK prevents
-- user_id rewrites that would move the row to another subject.
create policy user_preferences_update on public.user_preferences
  for update to authenticated using (
    user_id = (select auth.uid())
  ) with check (
    user_id = (select auth.uid())
  );

-- DELETE: user can delete only their own row.
create policy user_preferences_delete on public.user_preferences
  for delete to authenticated using (
    user_id = (select auth.uid())
  );

-- Timestamp trigger reuses the existing helper.
create trigger user_preferences_set_timestamps
  before insert or update on public.user_preferences
  for each row execute function public.trigger_set_timestamps();
