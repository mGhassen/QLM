-- Migration generated from schemas/43-user-preferences.sql.
-- Manually trimmed: the auto-diff also emitted drop/re-add pairs for
-- unrelated platform-table check constraints (data_clone, data_snapshot,
-- db_role, deployment_request). Those were identical definitions re-added
-- and cause needless churn on reset — removed. Also restored the
-- explicit `revoke` before the `grant`, matching the declarative schema.

create table "public"."user_preferences" (
    "user_id" uuid not null,
    "preferences" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);

alter table "public"."user_preferences" enable row level security;

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id);

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

-- Tight default permissions: only authenticated, only self-row.
revoke all on table "public"."user_preferences" from "anon", "authenticated", "service_role";

grant select, insert, update, delete on table "public"."user_preferences" to "authenticated";


create policy "user_preferences_delete"
  on "public"."user_preferences"
  as permissive
  for delete
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "user_preferences_insert"
  on "public"."user_preferences"
  as permissive
  for insert
  to authenticated
  with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "user_preferences_read"
  on "public"."user_preferences"
  as permissive
  for select
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "user_preferences_update"
  on "public"."user_preferences"
  as permissive
  for update
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));


CREATE TRIGGER user_preferences_set_timestamps
  BEFORE INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();
