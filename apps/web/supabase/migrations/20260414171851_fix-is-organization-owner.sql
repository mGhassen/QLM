alter table "public"."data_clone" drop constraint "data_clone_environment_type_check";

alter table "public"."data_clone" drop constraint "data_clone_status_check";

alter table "public"."data_snapshot" drop constraint "data_snapshot_snapshot_type_check";

alter table "public"."data_snapshot" drop constraint "data_snapshot_status_check";

alter table "public"."db_role" drop constraint "db_role_status_check";

alter table "public"."deployment_request" drop constraint "deployment_request_deployment_type_check";

alter table "public"."deployment_request" drop constraint "deployment_request_status_check";

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

CREATE OR REPLACE FUNCTION public.is_organization_owner(organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(
    select 1
    from public.organizations
    where id = is_organization_owner.organization_id
      and user_id = auth.uid()
  );
$function$
;


