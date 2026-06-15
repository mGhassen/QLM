create type "public"."node_health" as enum ('healthy', 'warning', 'critical', 'offline', 'unknown');

create type "public"."node_lifecycle_status" as enum ('provisioning', 'running', 'draining', 'stopped', 'terminating', 'error');

drop policy "node_read" on "public"."node";

alter table "public"."data_clone" drop constraint "data_clone_environment_type_check";

alter table "public"."data_clone" drop constraint "data_clone_status_check";

alter table "public"."data_snapshot" drop constraint "data_snapshot_snapshot_type_check";

alter table "public"."data_snapshot" drop constraint "data_snapshot_status_check";

alter table "public"."db_role" drop constraint "db_role_status_check";

alter table "public"."deployment_request" drop constraint "deployment_request_deployment_type_check";

alter table "public"."deployment_request" drop constraint "deployment_request_status_check";


  create table "public"."node_runtime_state" (
    "node_id" uuid not null,
    "health" public.node_health not null default 'unknown'::public.node_health,
    "cpu_util_pct" numeric(5,2),
    "mem_util_pct" numeric(5,2),
    "disk_util_pct" numeric(5,2),
    "last_seen_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."node_runtime_state" enable row level security;

alter table "public"."node" add column "availability_zone" character varying(64);

alter table "public"."node" add column "disk_gb" integer;

alter table "public"."node" add column "instance_type" character varying(64);

alter table "public"."node" add column "ip" inet;

alter table "public"."node" add column "labels" jsonb not null default '{}'::jsonb;

alter table "public"."node" add column "lifecycle_status" public.node_lifecycle_status;

alter table "public"."node" add column "organization_id" uuid;

alter table "public"."node" add column "owner" character varying(255);

alter table "public"."node" add column "tags" text[] not null default '{}'::text[];

alter table "public"."node" add column "version" integer not null default 1;

CREATE INDEX idx_node_labels ON public.node USING gin (labels);

CREATE INDEX idx_node_lifecycle_status ON public.node USING btree (lifecycle_status);

CREATE INDEX idx_node_org_deleted ON public.node USING btree (organization_id, is_deleted);

CREATE INDEX idx_node_pool ON public.node USING btree (node_pool);

CREATE INDEX idx_node_provider_region ON public.node USING btree (hosting_provider, region);

CREATE UNIQUE INDEX node_runtime_state_pkey ON public.node_runtime_state USING btree (node_id);

alter table "public"."node_runtime_state" add constraint "node_runtime_state_pkey" PRIMARY KEY using index "node_runtime_state_pkey";

alter table "public"."node" add constraint "node_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."node" validate constraint "node_organization_id_fkey";

alter table "public"."node_runtime_state" add constraint "node_runtime_state_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public.node(id) ON DELETE CASCADE not valid;

alter table "public"."node_runtime_state" validate constraint "node_runtime_state_node_id_fkey";

alter table "public"."data_clone" add constraint "data_clone_environment_type_check" CHECK (((environment_type)::text = ANY ((ARRAY['File'::character varying, 'Database'::character varying, 'Server'::character varying])::text[]))) not valid;

alter table "public"."data_clone" validate constraint "data_clone_environment_type_check";

alter table "public"."data_clone" add constraint "data_clone_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."data_clone" validate constraint "data_clone_status_check";

alter table "public"."data_snapshot" add constraint "data_snapshot_snapshot_type_check" CHECK (((snapshot_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'AUTO'::character varying, 'INIT'::character varying])::text[]))) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_snapshot_type_check";

alter table "public"."data_snapshot" add constraint "data_snapshot_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_status_check";

alter table "public"."db_role" add constraint "db_role_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'CREATED'::character varying, 'ACTIVE'::character varying, 'REVOKED'::character varying, 'DELETED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."db_role" validate constraint "db_role_status_check";

alter table "public"."deployment_request" add constraint "deployment_request_deployment_type_check" CHECK (((deployment_type)::text = ANY ((ARRAY['REPOSITORY'::character varying, 'SHADOW'::character varying, 'F2'::character varying])::text[]))) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_deployment_type_check";

alter table "public"."deployment_request" add constraint "deployment_request_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying, 'DELETED'::character varying])::text[]))) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.trigger_increment_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_org_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  base_slug text;
  unique_slug text;
  new_org_id uuid;
  suffix int := 0;
begin
  -- Skip if this user already has an organization (seed-inserted etc.).
  if exists (
    select 1 from public.organizations where user_id = new.id
    union
    select 1 from public.organization_memberships where user_id = new.id
  ) then
    return new;
  end if;

  base_slug := coalesce(
    nullif(public.slugify(split_part(new.email, '@', 1)), ''),
    'workspace'
  );
  unique_slug := base_slug;

  -- Collision-safe slug — suffix with -2, -3, ... until unique.
  while exists (select 1 from public.organizations where slug = unique_slug) loop
    suffix := suffix + 1;
    unique_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.organizations(id, slug, name, user_id, created_at, updated_at, created_by, updated_by)
  values (extensions.uuid_generate_v4(), unique_slug, base_slug, new.id, now(), now(), new.id, new.id)
  returning id into new_org_id;

  insert into public.organization_memberships(user_id, organization_id, account_role, created_at, updated_at, created_by, updated_by)
  values (new.id, new_org_id, 'owner', now(), now(), new.id, new.id);

  return new;
end;
$function$
;

grant delete on table "public"."node_runtime_state" to "anon";

grant insert on table "public"."node_runtime_state" to "anon";

grant references on table "public"."node_runtime_state" to "anon";

grant select on table "public"."node_runtime_state" to "anon";

grant trigger on table "public"."node_runtime_state" to "anon";

grant truncate on table "public"."node_runtime_state" to "anon";

grant update on table "public"."node_runtime_state" to "anon";

grant select on table "public"."node_runtime_state" to "authenticated";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";


  create policy "node_runtime_state_read"
  on "public"."node_runtime_state"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.node n
  WHERE ((n.id = node_runtime_state.node_id) AND (((n.organization_id IS NULL) AND (n.node_type = 'public'::public.node_type)) OR ((n.organization_id IS NOT NULL) AND public.has_role_on_organization(n.organization_id))) AND (n.is_deleted = false)))));



  create policy "node_read"
  on "public"."node"
  as permissive
  for select
  to authenticated
using (((is_deleted = false) AND (((organization_id IS NULL) AND (node_type = 'public'::public.node_type)) OR ((organization_id IS NOT NULL) AND public.has_role_on_organization(organization_id)))));


CREATE TRIGGER increment_node_version BEFORE UPDATE ON public.node FOR EACH ROW EXECUTE FUNCTION public.trigger_increment_version();


