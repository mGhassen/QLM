create type "public"."compute_status" as enum ('INIT', 'PENDING', 'RUNNING', 'STOPPED', 'ERROR');

create type "public"."hosting_provider" as enum ('AWS', 'Azure', 'GCP', 'DigitalOcean', 'Linode', 'Vultr', 'Other', 'On-premise');

create type "public"."job_status" as enum ('INIT', 'PENDING', 'IN_PROGRESS', 'CREATED', 'ERROR', 'DELETED');

create type "public"."node_status" as enum ('Up', 'Down');

create type "public"."node_type" as enum ('private', 'public');


  create table "public"."branch" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "deployment_id" uuid,
    "label_name" character varying(255) not null,
    "branch_name" character varying(255),
    "snapshot_id" uuid,
    "job_status" public.job_status not null default 'INIT'::public.job_status,
    "is_ephemeral" boolean default false,
    "is_masked" boolean default false,
    "is_purged" boolean default false,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."compute" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "label_name" character varying(255) not null,
    "job_status" public.job_status not null default 'INIT'::public.job_status,
    "compute_status" public.compute_status,
    "deployment_id" uuid,
    "branch_id" uuid,
    "performance_profile_id" uuid not null,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."data_clone" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(255) not null,
    "branch_name" character varying(255),
    "status" character varying(255) not null default 'INIT'::character varying,
    "account_id" uuid not null,
    "snapshot_id" uuid,
    "deployment_id" uuid,
    "environment_type" character varying(255),
    "database_provider" character varying(255),
    "database_version" character varying(50) not null default 'latest'::character varying,
    "database_username" character varying(50),
    "database_password" character varying(50),
    "is_ephemeral" boolean default false,
    "is_masked" boolean default false,
    "is_purged" boolean default false,
    "performance_profile_id" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."data_snapshot" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(8) generated always as ("substring"((id)::text, 1, 8)) stored,
    "status" character varying(255) not null default 'INIT'::character varying,
    "snapshot_type" character varying(255) not null default 'MANUAL'::character varying,
    "snapshot_comment" character varying(255),
    "snapshot_schema" json,
    "snapshot_db_roles_id" jsonb,
    "account_id" uuid not null,
    "dataset_id" uuid,
    "deployment_id" uuid,
    "parent_id" uuid,
    "is_ephemeral" boolean default false,
    "is_golden" boolean not null default false,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."db_role" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "username" character varying(255) not null,
    "password" character varying(255) not null,
    "password_validity" timestamp with time zone,
    "privileges" jsonb not null default '[]'::jsonb,
    "status" character varying(20) not null default 'INIT'::character varying,
    "superuser" boolean not null default false,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."deployment_request" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(255) not null,
    "status" character varying(255) not null default 'INIT'::character varying,
    "account_id" uuid not null,
    "clone_id" uuid,
    "snapshot_id" uuid,
    "snapshot_parent" uuid,
    "pipeline_id" uuid,
    "current_clone" uuid,
    "deployment_parent" uuid,
    "deployment_type" character varying(255) not null default 'REPOSITORY'::character varying,
    "repository_name" character varying(255) not null,
    "fqdn" character varying(255) not null,
    "database_provider" character varying(255) not null,
    "database_version" character varying(50) not null default 'latest'::character varying,
    "database_username" character varying(50),
    "database_password" character varying(50),
    "node_id" uuid,
    "port" integer,
    "db_user_id" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."deployment_settings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "deployment_id" uuid,
    "setting_catalog_id" uuid,
    "setting_value" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."deployment_settings_catalog" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "node_id" uuid,
    "setting_name" character varying(255) not null,
    "setting_type" character varying(50) not null default 'string'::character varying,
    "setting_category" character varying(100) not null default 'general'::character varying,
    "default_value" text,
    "description" text,
    "validation_rules" jsonb default '{}'::jsonb,
    "is_required" boolean default false,
    "is_system_setting" boolean default false,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."image_provider" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid,
    "image_provider_id" uuid,
    "is_active" boolean default true,
    "is_default" boolean default false
      );



  create table "public"."image_provider_catalog" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "image_type" character varying(255) not null default 'PUBLIC'::character varying,
    "database_provider" character varying(255) not null,
    "database_version" character varying(50) not null,
    "volume_path" character varying(255) not null,
    "log_path" character varying(255) not null,
    "image_source" character varying(255) not null default 'dockerhub'::character varying,
    "image_registry" character varying(255),
    "registry_username" character varying(255),
    "registry_password" character varying(255),
    "image_name" character varying(255) not null,
    "min_cpu" integer not null default 100,
    "min_memory" integer not null default 128,
    "user_var_name" character varying(255),
    "password_var_name" character varying(255),
    "database_var_name" character varying(255),
    "default_port" integer not null,
    "user_uid" integer not null,
    "user_gid" integer not null,
    "support_status" character varying(255) not null default 'SUPPORTED'::character varying,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."node" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "label_name" character varying(255) not null,
    "account_id" uuid,
    "node_type" public.node_type not null,
    "node_pool" character varying(255) not null,
    "datacenter" character varying(255) not null,
    "region" character varying(255) not null,
    "hosting_provider" public.hosting_provider not null,
    "node_status" public.node_status not null default 'Down'::public.node_status,
    "metadata" jsonb default '{}'::jsonb,
    "memory" integer not null,
    "cpu" integer not null,
    "storage" integer not null,
    "is_deleted" boolean not null default false,
    "is_default" boolean not null default false,
    "is_active" boolean not null default false,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."performance_profile" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid,
    "label_name" character varying(255) not null,
    "description_text" text,
    "database_provider" character varying(255) not null,
    "database_version" character varying(50) not null,
    "min_cpu" integer not null default 100,
    "min_memory" integer not null default 128,
    "config_flags" jsonb,
    "is_default" boolean not null default false,
    "is_active" boolean not null default false,
    "is_seed" boolean not null default false,
    "profile_key" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."resources" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid,
    "resource_type" text not null,
    "resource_unit" text not null,
    "resource_value" numeric not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );



  create table "public"."user_tokens" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "token_name" character varying(255) not null,
    "scopes" jsonb not null,
    "expires_at" bigint not null,
    "revoked" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


CREATE UNIQUE INDEX branch_label_name_key ON public.branch USING btree (label_name);

CREATE UNIQUE INDEX branch_pkey ON public.branch USING btree (id);

CREATE UNIQUE INDEX compute_label_name_key ON public.compute USING btree (label_name);

CREATE UNIQUE INDEX compute_pkey ON public.compute USING btree (id);

CREATE UNIQUE INDEX data_clone_name_key ON public.data_clone USING btree (name);

CREATE UNIQUE INDEX data_clone_pkey ON public.data_clone USING btree (id);

CREATE UNIQUE INDEX data_snapshot_pkey ON public.data_snapshot USING btree (id);

CREATE UNIQUE INDEX data_snapshot_unique_name_dataset ON public.data_snapshot USING btree (name, dataset_id);

CREATE UNIQUE INDEX db_role_pkey ON public.db_role USING btree (id);

CREATE UNIQUE INDEX deployment_request_fqdn_key ON public.deployment_request USING btree (fqdn);

CREATE UNIQUE INDEX deployment_request_name_key ON public.deployment_request USING btree (name);

CREATE UNIQUE INDEX deployment_request_pkey ON public.deployment_request USING btree (id);

CREATE UNIQUE INDEX deployment_request_port_key ON public.deployment_request USING btree (port);

CREATE INDEX deployment_settings_by_active ON public.deployment_settings USING btree (is_active);

CREATE INDEX deployment_settings_by_catalog_id ON public.deployment_settings USING btree (setting_catalog_id);

CREATE INDEX deployment_settings_by_deployment_id ON public.deployment_settings USING btree (deployment_id);

CREATE INDEX deployment_settings_catalog_by_category ON public.deployment_settings_catalog USING btree (setting_category);

CREATE INDEX deployment_settings_catalog_by_name ON public.deployment_settings_catalog USING btree (setting_name);

CREATE INDEX deployment_settings_catalog_by_node_id ON public.deployment_settings_catalog USING btree (node_id);

CREATE UNIQUE INDEX deployment_settings_catalog_node_setting_unique ON public.deployment_settings_catalog USING btree (node_id, setting_name);

CREATE UNIQUE INDEX deployment_settings_catalog_pkey ON public.deployment_settings_catalog USING btree (id);

CREATE UNIQUE INDEX deployment_settings_deployment_catalog_unique ON public.deployment_settings USING btree (deployment_id, setting_catalog_id);

CREATE UNIQUE INDEX deployment_settings_pkey ON public.deployment_settings USING btree (id);

CREATE INDEX image_provider_by_account_id ON public.image_provider USING btree (account_id);

CREATE INDEX image_provider_by_catalog_id ON public.image_provider USING btree (image_provider_id);

CREATE UNIQUE INDEX image_provider_catalog_pkey ON public.image_provider_catalog USING btree (id);

CREATE UNIQUE INDEX image_provider_pkey ON public.image_provider USING btree (id);

CREATE UNIQUE INDEX node_pkey ON public.node USING btree (id);

CREATE UNIQUE INDEX performance_profile_label_name_key ON public.performance_profile USING btree (label_name);

CREATE UNIQUE INDEX performance_profile_pkey ON public.performance_profile USING btree (id);

CREATE UNIQUE INDEX performance_profile_profile_key_key ON public.performance_profile USING btree (profile_key);

CREATE INDEX resources_by_account_id ON public.resources USING btree (account_id);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX resources_unique_account_type ON public.resources USING btree (account_id, resource_type) WHERE (account_id IS NOT NULL);

CREATE UNIQUE INDEX resources_unique_global_type ON public.resources USING btree (resource_type) WHERE (account_id IS NULL);

CREATE UNIQUE INDEX unique_account_node ON public.node USING btree (account_id, id) WHERE (account_id IS NOT NULL);

CREATE UNIQUE INDEX unique_account_performance_profile ON public.performance_profile USING btree (account_id, id) WHERE (account_id IS NOT NULL);

CREATE UNIQUE INDEX unique_public_performance_profile ON public.performance_profile USING btree (id) WHERE (account_id IS NULL);

CREATE UNIQUE INDEX unique_shared_node ON public.node USING btree (id) WHERE (account_id IS NULL);

CREATE INDEX user_tokens_by_account_id ON public.user_tokens USING btree (account_id);

CREATE UNIQUE INDEX user_tokens_pkey ON public.user_tokens USING btree (id);

alter table "public"."branch" add constraint "branch_pkey" PRIMARY KEY using index "branch_pkey";

alter table "public"."compute" add constraint "compute_pkey" PRIMARY KEY using index "compute_pkey";

alter table "public"."data_clone" add constraint "data_clone_pkey" PRIMARY KEY using index "data_clone_pkey";

alter table "public"."data_snapshot" add constraint "data_snapshot_pkey" PRIMARY KEY using index "data_snapshot_pkey";

alter table "public"."db_role" add constraint "db_role_pkey" PRIMARY KEY using index "db_role_pkey";

alter table "public"."deployment_request" add constraint "deployment_request_pkey" PRIMARY KEY using index "deployment_request_pkey";

alter table "public"."deployment_settings" add constraint "deployment_settings_pkey" PRIMARY KEY using index "deployment_settings_pkey";

alter table "public"."deployment_settings_catalog" add constraint "deployment_settings_catalog_pkey" PRIMARY KEY using index "deployment_settings_catalog_pkey";

alter table "public"."image_provider" add constraint "image_provider_pkey" PRIMARY KEY using index "image_provider_pkey";

alter table "public"."image_provider_catalog" add constraint "image_provider_catalog_pkey" PRIMARY KEY using index "image_provider_catalog_pkey";

alter table "public"."node" add constraint "node_pkey" PRIMARY KEY using index "node_pkey";

alter table "public"."performance_profile" add constraint "performance_profile_pkey" PRIMARY KEY using index "performance_profile_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."user_tokens" add constraint "user_tokens_pkey" PRIMARY KEY using index "user_tokens_pkey";

alter table "public"."branch" add constraint "branch_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."branch" validate constraint "branch_account_id_fkey";

alter table "public"."branch" add constraint "branch_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."branch" validate constraint "branch_created_by_fkey";

alter table "public"."branch" add constraint "branch_deployment_id_fkey" FOREIGN KEY (deployment_id) REFERENCES public.deployment_request(id) not valid;

alter table "public"."branch" validate constraint "branch_deployment_id_fkey";

alter table "public"."branch" add constraint "branch_label_name_key" UNIQUE using index "branch_label_name_key";

alter table "public"."branch" add constraint "branch_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES public.data_snapshot(id) not valid;

alter table "public"."branch" validate constraint "branch_snapshot_id_fkey";

alter table "public"."branch" add constraint "branch_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."branch" validate constraint "branch_updated_by_fkey";

alter table "public"."compute" add constraint "compute_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."compute" validate constraint "compute_account_id_fkey";

alter table "public"."compute" add constraint "compute_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branch(id) not valid;

alter table "public"."compute" validate constraint "compute_branch_id_fkey";

alter table "public"."compute" add constraint "compute_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."compute" validate constraint "compute_created_by_fkey";

alter table "public"."compute" add constraint "compute_deployment_id_fkey" FOREIGN KEY (deployment_id) REFERENCES public.deployment_request(id) not valid;

alter table "public"."compute" validate constraint "compute_deployment_id_fkey";

alter table "public"."compute" add constraint "compute_label_name_key" UNIQUE using index "compute_label_name_key";

alter table "public"."compute" add constraint "compute_performance_profile_id_fkey" FOREIGN KEY (performance_profile_id) REFERENCES public.performance_profile(id) not valid;

alter table "public"."compute" validate constraint "compute_performance_profile_id_fkey";

alter table "public"."compute" add constraint "compute_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."compute" validate constraint "compute_updated_by_fkey";

alter table "public"."data_clone" add constraint "data_clone_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."data_clone" validate constraint "data_clone_account_id_fkey";

alter table "public"."data_clone" add constraint "data_clone_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."data_clone" validate constraint "data_clone_created_by_fkey";

alter table "public"."data_clone" add constraint "data_clone_environment_type_check" CHECK (((environment_type)::text = ANY ((ARRAY['File'::character varying, 'Database'::character varying, 'Server'::character varying])::text[]))) not valid;

alter table "public"."data_clone" validate constraint "data_clone_environment_type_check";

alter table "public"."data_clone" add constraint "data_clone_name_key" UNIQUE using index "data_clone_name_key";

alter table "public"."data_clone" add constraint "data_clone_performance_profile_id_fkey" FOREIGN KEY (performance_profile_id) REFERENCES public.performance_profile(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."data_clone" validate constraint "data_clone_performance_profile_id_fkey";

alter table "public"."data_clone" add constraint "data_clone_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES public.data_snapshot(id) not valid;

alter table "public"."data_clone" validate constraint "data_clone_snapshot_id_fkey";

alter table "public"."data_clone" add constraint "data_clone_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."data_clone" validate constraint "data_clone_status_check";

alter table "public"."data_clone" add constraint "data_clone_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."data_clone" validate constraint "data_clone_updated_by_fkey";

alter table "public"."data_snapshot" add constraint "data_snapshot_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_account_id_fkey";

alter table "public"."data_snapshot" add constraint "data_snapshot_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_created_by_fkey";

alter table "public"."data_snapshot" add constraint "data_snapshot_deployment_id_fkey" FOREIGN KEY (deployment_id) REFERENCES public.deployment_request(id) ON DELETE SET NULL not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_deployment_id_fkey";

alter table "public"."data_snapshot" add constraint "data_snapshot_snapshot_type_check" CHECK (((snapshot_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'AUTO'::character varying, 'INIT'::character varying])::text[]))) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_snapshot_type_check";

alter table "public"."data_snapshot" add constraint "data_snapshot_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_status_check";

alter table "public"."data_snapshot" add constraint "data_snapshot_unique_name_dataset" UNIQUE using index "data_snapshot_unique_name_dataset";

alter table "public"."data_snapshot" add constraint "data_snapshot_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."data_snapshot" validate constraint "data_snapshot_updated_by_fkey";

alter table "public"."db_role" add constraint "db_role_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."db_role" validate constraint "db_role_created_by_fkey";

alter table "public"."db_role" add constraint "db_role_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'CREATED'::character varying, 'ACTIVE'::character varying, 'REVOKED'::character varying, 'DELETED'::character varying, 'ERROR'::character varying])::text[]))) not valid;

alter table "public"."db_role" validate constraint "db_role_status_check";

alter table "public"."db_role" add constraint "db_role_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."db_role" validate constraint "db_role_updated_by_fkey";

alter table "public"."deployment_request" add constraint "deployment_request_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_account_id_fkey";

alter table "public"."deployment_request" add constraint "deployment_request_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_created_by_fkey";

alter table "public"."deployment_request" add constraint "deployment_request_db_user_id_fkey" FOREIGN KEY (db_user_id) REFERENCES public.db_role(id) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_db_user_id_fkey";

alter table "public"."deployment_request" add constraint "deployment_request_deployment_type_check" CHECK (((deployment_type)::text = ANY ((ARRAY['REPOSITORY'::character varying, 'SHADOW'::character varying, 'F2'::character varying])::text[]))) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_deployment_type_check";

alter table "public"."deployment_request" add constraint "deployment_request_fqdn_key" UNIQUE using index "deployment_request_fqdn_key";

alter table "public"."deployment_request" add constraint "deployment_request_name_key" UNIQUE using index "deployment_request_name_key";

alter table "public"."deployment_request" add constraint "deployment_request_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public.node(id) ON DELETE SET NULL not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_node_id_fkey";

alter table "public"."deployment_request" add constraint "deployment_request_port_key" UNIQUE using index "deployment_request_port_key";

alter table "public"."deployment_request" add constraint "deployment_request_status_check" CHECK (((status)::text = ANY ((ARRAY['INIT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'CREATED'::character varying, 'ERROR'::character varying, 'DELETED'::character varying])::text[]))) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_status_check";

alter table "public"."deployment_request" add constraint "deployment_request_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_request" validate constraint "deployment_request_updated_by_fkey";

alter table "public"."deployment_settings" add constraint "deployment_settings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_settings" validate constraint "deployment_settings_created_by_fkey";

alter table "public"."deployment_settings" add constraint "deployment_settings_deployment_catalog_unique" UNIQUE using index "deployment_settings_deployment_catalog_unique";

alter table "public"."deployment_settings" add constraint "deployment_settings_deployment_id_fkey" FOREIGN KEY (deployment_id) REFERENCES public.deployment_request(id) ON DELETE CASCADE not valid;

alter table "public"."deployment_settings" validate constraint "deployment_settings_deployment_id_fkey";

alter table "public"."deployment_settings" add constraint "deployment_settings_setting_catalog_id_fkey" FOREIGN KEY (setting_catalog_id) REFERENCES public.deployment_settings_catalog(id) ON DELETE CASCADE not valid;

alter table "public"."deployment_settings" validate constraint "deployment_settings_setting_catalog_id_fkey";

alter table "public"."deployment_settings" add constraint "deployment_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_settings" validate constraint "deployment_settings_updated_by_fkey";

alter table "public"."deployment_settings_catalog" add constraint "deployment_settings_catalog_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_settings_catalog" validate constraint "deployment_settings_catalog_created_by_fkey";

alter table "public"."deployment_settings_catalog" add constraint "deployment_settings_catalog_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public.node(id) ON DELETE CASCADE not valid;

alter table "public"."deployment_settings_catalog" validate constraint "deployment_settings_catalog_node_id_fkey";

alter table "public"."deployment_settings_catalog" add constraint "deployment_settings_catalog_node_setting_unique" UNIQUE using index "deployment_settings_catalog_node_setting_unique";

alter table "public"."deployment_settings_catalog" add constraint "deployment_settings_catalog_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."deployment_settings_catalog" validate constraint "deployment_settings_catalog_updated_by_fkey";

alter table "public"."image_provider" add constraint "image_provider_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."image_provider" validate constraint "image_provider_account_id_fkey";

alter table "public"."image_provider" add constraint "image_provider_image_provider_id_fkey" FOREIGN KEY (image_provider_id) REFERENCES public.image_provider_catalog(id) ON DELETE CASCADE not valid;

alter table "public"."image_provider" validate constraint "image_provider_image_provider_id_fkey";

alter table "public"."image_provider_catalog" add constraint "image_provider_catalog_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."image_provider_catalog" validate constraint "image_provider_catalog_created_by_fkey";

alter table "public"."image_provider_catalog" add constraint "image_provider_catalog_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."image_provider_catalog" validate constraint "image_provider_catalog_updated_by_fkey";

alter table "public"."node" add constraint "node_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."node" validate constraint "node_account_id_fkey";

alter table "public"."node" add constraint "node_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."node" validate constraint "node_created_by_fkey";

alter table "public"."node" add constraint "node_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."node" validate constraint "node_updated_by_fkey";

alter table "public"."performance_profile" add constraint "performance_profile_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."performance_profile" validate constraint "performance_profile_account_id_fkey";

alter table "public"."performance_profile" add constraint "performance_profile_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."performance_profile" validate constraint "performance_profile_created_by_fkey";

alter table "public"."performance_profile" add constraint "performance_profile_label_name_key" UNIQUE using index "performance_profile_label_name_key";

alter table "public"."performance_profile" add constraint "performance_profile_profile_key_key" UNIQUE using index "performance_profile_profile_key_key";

alter table "public"."performance_profile" add constraint "performance_profile_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."performance_profile" validate constraint "performance_profile_updated_by_fkey";

alter table "public"."resources" add constraint "resources_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_account_id_fkey";

alter table "public"."resources" add constraint "resources_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."resources" validate constraint "resources_created_by_fkey";

alter table "public"."resources" add constraint "resources_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."resources" validate constraint "resources_updated_by_fkey";

alter table "public"."user_tokens" add constraint "user_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."user_tokens" validate constraint "user_tokens_account_id_fkey";

alter table "public"."user_tokens" add constraint "user_tokens_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_tokens" validate constraint "user_tokens_created_by_fkey";

alter table "public"."user_tokens" add constraint "user_tokens_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_tokens" validate constraint "user_tokens_updated_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_deployment_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into public.deployment_settings (deployment_id, setting_catalog_id, setting_value, is_active)
  select
    NEW.id as deployment_id,
    sc.id as setting_catalog_id,
    sc.default_value as setting_value,
    true as is_active
  from public.deployment_settings_catalog sc
  where sc.node_id is null
     or sc.node_id = NEW.node_id
  on conflict (deployment_id, setting_catalog_id) do nothing;
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_profile_key()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  return 'pk_' || floor(random() * 1000000)::int;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_random_port()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  new_port integer;
  port_exists boolean;
begin
  loop
    new_port := floor(random() * (32000 - 20000 + 1) + 20000)::integer;
    select exists (
      select 1 from public.deployment_request where port = new_port
    ) into port_exists;
    exit when not port_exists;
  end loop;
  return new_port;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_deployment_random_port()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if NEW.port is null then
    NEW.port := public.generate_random_port();
  end if;
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(target_organization_id uuid, new_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    if current_user not in('service_role') then
        raise exception 'You do not have permission to transfer organization ownership';
    end if;

    -- verify the user is already a member of the organization
    if not exists(
        select
            1
        from
            public.organization_memberships
        where
            target_organization_id = organization_id
            and user_id = new_owner_id) then
        raise exception 'The new owner must be a member of the organization';
    end if;

    -- update the primary owner of the organization
    update
        public.organizations
    set
        user_id = new_owner_id
    where
        id = target_organization_id;

    -- update membership assigning it the hierarchy role
    update
        public.organization_memberships
    set
        account_role =(
            public.get_upper_system_role())
    where
        target_organization_id = organization_id
        and user_id = new_owner_id
        and account_role <>(
            public.get_upper_system_role());

end;

$function$
;

CREATE OR REPLACE FUNCTION public.trigger_on_account_welcome_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  new_org_id uuid;
  org_slug text;
  owner_role varchar(50);
begin
  -- Create default organization for the new user
  new_org_id := extensions.uuid_generate_v4();
  org_slug := 'personal-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations (
    id,
    user_id,
    name,
    slug,
    created_at,
    updated_at
  ) values (
    new_org_id,
    NEW.user_id,
    coalesce(nullif(trim(NEW.name), ''), 'Personal'),
    org_slug,
    now(),
    now()
  );

  -- Add user as owner (add_current_user_to_new_organization may not fire when auth.uid() is null)
  select public.get_upper_system_role() into owner_role;
  insert into public.organization_memberships (
    organization_id,
    user_id,
    account_role,
    created_at,
    updated_at
  ) values (
    new_org_id,
    NEW.user_id,
    owner_role,
    now(),
    now()
  )
  on conflict (user_id, organization_id) do nothing;

  -- Add 100 welcome credits
  perform public.add_credits_to_organization(
    new_org_id,
    100,
    null,
    'Welcome credits for new user'
  );

  return NEW;
end;
$function$
;

grant delete on table "public"."branch" to "anon";

grant insert on table "public"."branch" to "anon";

grant references on table "public"."branch" to "anon";

grant select on table "public"."branch" to "anon";

grant trigger on table "public"."branch" to "anon";

grant truncate on table "public"."branch" to "anon";

grant update on table "public"."branch" to "anon";

grant delete on table "public"."branch" to "authenticated";

grant insert on table "public"."branch" to "authenticated";

grant references on table "public"."branch" to "authenticated";

grant select on table "public"."branch" to "authenticated";

grant trigger on table "public"."branch" to "authenticated";

grant truncate on table "public"."branch" to "authenticated";

grant update on table "public"."branch" to "authenticated";

grant delete on table "public"."branch" to "service_role";

grant insert on table "public"."branch" to "service_role";

grant references on table "public"."branch" to "service_role";

grant select on table "public"."branch" to "service_role";

grant trigger on table "public"."branch" to "service_role";

grant truncate on table "public"."branch" to "service_role";

grant update on table "public"."branch" to "service_role";

grant delete on table "public"."compute" to "anon";

grant insert on table "public"."compute" to "anon";

grant references on table "public"."compute" to "anon";

grant select on table "public"."compute" to "anon";

grant trigger on table "public"."compute" to "anon";

grant truncate on table "public"."compute" to "anon";

grant update on table "public"."compute" to "anon";

grant delete on table "public"."compute" to "authenticated";

grant insert on table "public"."compute" to "authenticated";

grant references on table "public"."compute" to "authenticated";

grant select on table "public"."compute" to "authenticated";

grant trigger on table "public"."compute" to "authenticated";

grant truncate on table "public"."compute" to "authenticated";

grant update on table "public"."compute" to "authenticated";

grant delete on table "public"."compute" to "service_role";

grant insert on table "public"."compute" to "service_role";

grant references on table "public"."compute" to "service_role";

grant select on table "public"."compute" to "service_role";

grant trigger on table "public"."compute" to "service_role";

grant truncate on table "public"."compute" to "service_role";

grant update on table "public"."compute" to "service_role";

grant delete on table "public"."data_clone" to "anon";

grant insert on table "public"."data_clone" to "anon";

grant references on table "public"."data_clone" to "anon";

grant select on table "public"."data_clone" to "anon";

grant trigger on table "public"."data_clone" to "anon";

grant truncate on table "public"."data_clone" to "anon";

grant update on table "public"."data_clone" to "anon";

grant delete on table "public"."data_clone" to "authenticated";

grant insert on table "public"."data_clone" to "authenticated";

grant references on table "public"."data_clone" to "authenticated";

grant select on table "public"."data_clone" to "authenticated";

grant trigger on table "public"."data_clone" to "authenticated";

grant truncate on table "public"."data_clone" to "authenticated";

grant update on table "public"."data_clone" to "authenticated";

grant delete on table "public"."data_clone" to "service_role";

grant insert on table "public"."data_clone" to "service_role";

grant references on table "public"."data_clone" to "service_role";

grant select on table "public"."data_clone" to "service_role";

grant trigger on table "public"."data_clone" to "service_role";

grant truncate on table "public"."data_clone" to "service_role";

grant update on table "public"."data_clone" to "service_role";

grant delete on table "public"."data_snapshot" to "anon";

grant insert on table "public"."data_snapshot" to "anon";

grant references on table "public"."data_snapshot" to "anon";

grant select on table "public"."data_snapshot" to "anon";

grant trigger on table "public"."data_snapshot" to "anon";

grant truncate on table "public"."data_snapshot" to "anon";

grant update on table "public"."data_snapshot" to "anon";

grant delete on table "public"."data_snapshot" to "authenticated";

grant insert on table "public"."data_snapshot" to "authenticated";

grant references on table "public"."data_snapshot" to "authenticated";

grant select on table "public"."data_snapshot" to "authenticated";

grant trigger on table "public"."data_snapshot" to "authenticated";

grant truncate on table "public"."data_snapshot" to "authenticated";

grant update on table "public"."data_snapshot" to "authenticated";

grant delete on table "public"."data_snapshot" to "service_role";

grant insert on table "public"."data_snapshot" to "service_role";

grant references on table "public"."data_snapshot" to "service_role";

grant select on table "public"."data_snapshot" to "service_role";

grant trigger on table "public"."data_snapshot" to "service_role";

grant truncate on table "public"."data_snapshot" to "service_role";

grant update on table "public"."data_snapshot" to "service_role";

grant delete on table "public"."db_role" to "anon";

grant insert on table "public"."db_role" to "anon";

grant references on table "public"."db_role" to "anon";

grant select on table "public"."db_role" to "anon";

grant trigger on table "public"."db_role" to "anon";

grant truncate on table "public"."db_role" to "anon";

grant update on table "public"."db_role" to "anon";

grant delete on table "public"."db_role" to "authenticated";

grant insert on table "public"."db_role" to "authenticated";

grant references on table "public"."db_role" to "authenticated";

grant select on table "public"."db_role" to "authenticated";

grant trigger on table "public"."db_role" to "authenticated";

grant truncate on table "public"."db_role" to "authenticated";

grant update on table "public"."db_role" to "authenticated";

grant delete on table "public"."db_role" to "service_role";

grant insert on table "public"."db_role" to "service_role";

grant references on table "public"."db_role" to "service_role";

grant select on table "public"."db_role" to "service_role";

grant trigger on table "public"."db_role" to "service_role";

grant truncate on table "public"."db_role" to "service_role";

grant update on table "public"."db_role" to "service_role";

grant delete on table "public"."deployment_request" to "anon";

grant insert on table "public"."deployment_request" to "anon";

grant references on table "public"."deployment_request" to "anon";

grant select on table "public"."deployment_request" to "anon";

grant trigger on table "public"."deployment_request" to "anon";

grant truncate on table "public"."deployment_request" to "anon";

grant update on table "public"."deployment_request" to "anon";

grant delete on table "public"."deployment_request" to "authenticated";

grant insert on table "public"."deployment_request" to "authenticated";

grant references on table "public"."deployment_request" to "authenticated";

grant select on table "public"."deployment_request" to "authenticated";

grant trigger on table "public"."deployment_request" to "authenticated";

grant truncate on table "public"."deployment_request" to "authenticated";

grant update on table "public"."deployment_request" to "authenticated";

grant delete on table "public"."deployment_request" to "service_role";

grant insert on table "public"."deployment_request" to "service_role";

grant references on table "public"."deployment_request" to "service_role";

grant select on table "public"."deployment_request" to "service_role";

grant trigger on table "public"."deployment_request" to "service_role";

grant truncate on table "public"."deployment_request" to "service_role";

grant update on table "public"."deployment_request" to "service_role";

grant delete on table "public"."deployment_settings" to "anon";

grant insert on table "public"."deployment_settings" to "anon";

grant references on table "public"."deployment_settings" to "anon";

grant select on table "public"."deployment_settings" to "anon";

grant trigger on table "public"."deployment_settings" to "anon";

grant truncate on table "public"."deployment_settings" to "anon";

grant update on table "public"."deployment_settings" to "anon";

grant delete on table "public"."deployment_settings" to "authenticated";

grant insert on table "public"."deployment_settings" to "authenticated";

grant references on table "public"."deployment_settings" to "authenticated";

grant select on table "public"."deployment_settings" to "authenticated";

grant trigger on table "public"."deployment_settings" to "authenticated";

grant truncate on table "public"."deployment_settings" to "authenticated";

grant update on table "public"."deployment_settings" to "authenticated";

grant delete on table "public"."deployment_settings" to "service_role";

grant insert on table "public"."deployment_settings" to "service_role";

grant references on table "public"."deployment_settings" to "service_role";

grant select on table "public"."deployment_settings" to "service_role";

grant trigger on table "public"."deployment_settings" to "service_role";

grant truncate on table "public"."deployment_settings" to "service_role";

grant update on table "public"."deployment_settings" to "service_role";

grant delete on table "public"."deployment_settings_catalog" to "anon";

grant insert on table "public"."deployment_settings_catalog" to "anon";

grant references on table "public"."deployment_settings_catalog" to "anon";

grant select on table "public"."deployment_settings_catalog" to "anon";

grant trigger on table "public"."deployment_settings_catalog" to "anon";

grant truncate on table "public"."deployment_settings_catalog" to "anon";

grant update on table "public"."deployment_settings_catalog" to "anon";

grant delete on table "public"."deployment_settings_catalog" to "authenticated";

grant insert on table "public"."deployment_settings_catalog" to "authenticated";

grant references on table "public"."deployment_settings_catalog" to "authenticated";

grant select on table "public"."deployment_settings_catalog" to "authenticated";

grant trigger on table "public"."deployment_settings_catalog" to "authenticated";

grant truncate on table "public"."deployment_settings_catalog" to "authenticated";

grant update on table "public"."deployment_settings_catalog" to "authenticated";

grant delete on table "public"."deployment_settings_catalog" to "service_role";

grant insert on table "public"."deployment_settings_catalog" to "service_role";

grant references on table "public"."deployment_settings_catalog" to "service_role";

grant select on table "public"."deployment_settings_catalog" to "service_role";

grant trigger on table "public"."deployment_settings_catalog" to "service_role";

grant truncate on table "public"."deployment_settings_catalog" to "service_role";

grant update on table "public"."deployment_settings_catalog" to "service_role";

grant delete on table "public"."image_provider" to "anon";

grant insert on table "public"."image_provider" to "anon";

grant references on table "public"."image_provider" to "anon";

grant select on table "public"."image_provider" to "anon";

grant trigger on table "public"."image_provider" to "anon";

grant truncate on table "public"."image_provider" to "anon";

grant update on table "public"."image_provider" to "anon";

grant delete on table "public"."image_provider" to "authenticated";

grant insert on table "public"."image_provider" to "authenticated";

grant references on table "public"."image_provider" to "authenticated";

grant select on table "public"."image_provider" to "authenticated";

grant trigger on table "public"."image_provider" to "authenticated";

grant truncate on table "public"."image_provider" to "authenticated";

grant update on table "public"."image_provider" to "authenticated";

grant delete on table "public"."image_provider" to "service_role";

grant insert on table "public"."image_provider" to "service_role";

grant references on table "public"."image_provider" to "service_role";

grant select on table "public"."image_provider" to "service_role";

grant trigger on table "public"."image_provider" to "service_role";

grant truncate on table "public"."image_provider" to "service_role";

grant update on table "public"."image_provider" to "service_role";

grant delete on table "public"."image_provider_catalog" to "anon";

grant insert on table "public"."image_provider_catalog" to "anon";

grant references on table "public"."image_provider_catalog" to "anon";

grant select on table "public"."image_provider_catalog" to "anon";

grant trigger on table "public"."image_provider_catalog" to "anon";

grant truncate on table "public"."image_provider_catalog" to "anon";

grant update on table "public"."image_provider_catalog" to "anon";

grant delete on table "public"."image_provider_catalog" to "authenticated";

grant insert on table "public"."image_provider_catalog" to "authenticated";

grant references on table "public"."image_provider_catalog" to "authenticated";

grant select on table "public"."image_provider_catalog" to "authenticated";

grant trigger on table "public"."image_provider_catalog" to "authenticated";

grant truncate on table "public"."image_provider_catalog" to "authenticated";

grant update on table "public"."image_provider_catalog" to "authenticated";

grant delete on table "public"."image_provider_catalog" to "service_role";

grant insert on table "public"."image_provider_catalog" to "service_role";

grant references on table "public"."image_provider_catalog" to "service_role";

grant select on table "public"."image_provider_catalog" to "service_role";

grant trigger on table "public"."image_provider_catalog" to "service_role";

grant truncate on table "public"."image_provider_catalog" to "service_role";

grant update on table "public"."image_provider_catalog" to "service_role";

grant delete on table "public"."node" to "anon";

grant insert on table "public"."node" to "anon";

grant references on table "public"."node" to "anon";

grant select on table "public"."node" to "anon";

grant trigger on table "public"."node" to "anon";

grant truncate on table "public"."node" to "anon";

grant update on table "public"."node" to "anon";

grant delete on table "public"."node" to "authenticated";

grant insert on table "public"."node" to "authenticated";

grant references on table "public"."node" to "authenticated";

grant select on table "public"."node" to "authenticated";

grant trigger on table "public"."node" to "authenticated";

grant truncate on table "public"."node" to "authenticated";

grant update on table "public"."node" to "authenticated";

grant delete on table "public"."node" to "service_role";

grant insert on table "public"."node" to "service_role";

grant references on table "public"."node" to "service_role";

grant select on table "public"."node" to "service_role";

grant trigger on table "public"."node" to "service_role";

grant truncate on table "public"."node" to "service_role";

grant update on table "public"."node" to "service_role";

grant delete on table "public"."performance_profile" to "anon";

grant insert on table "public"."performance_profile" to "anon";

grant references on table "public"."performance_profile" to "anon";

grant select on table "public"."performance_profile" to "anon";

grant trigger on table "public"."performance_profile" to "anon";

grant truncate on table "public"."performance_profile" to "anon";

grant update on table "public"."performance_profile" to "anon";

grant delete on table "public"."performance_profile" to "authenticated";

grant insert on table "public"."performance_profile" to "authenticated";

grant references on table "public"."performance_profile" to "authenticated";

grant select on table "public"."performance_profile" to "authenticated";

grant trigger on table "public"."performance_profile" to "authenticated";

grant truncate on table "public"."performance_profile" to "authenticated";

grant update on table "public"."performance_profile" to "authenticated";

grant delete on table "public"."performance_profile" to "service_role";

grant insert on table "public"."performance_profile" to "service_role";

grant references on table "public"."performance_profile" to "service_role";

grant select on table "public"."performance_profile" to "service_role";

grant trigger on table "public"."performance_profile" to "service_role";

grant truncate on table "public"."performance_profile" to "service_role";

grant update on table "public"."performance_profile" to "service_role";

grant delete on table "public"."resources" to "anon";

grant insert on table "public"."resources" to "anon";

grant references on table "public"."resources" to "anon";

grant select on table "public"."resources" to "anon";

grant trigger on table "public"."resources" to "anon";

grant truncate on table "public"."resources" to "anon";

grant update on table "public"."resources" to "anon";

grant delete on table "public"."resources" to "authenticated";

grant insert on table "public"."resources" to "authenticated";

grant references on table "public"."resources" to "authenticated";

grant select on table "public"."resources" to "authenticated";

grant trigger on table "public"."resources" to "authenticated";

grant truncate on table "public"."resources" to "authenticated";

grant update on table "public"."resources" to "authenticated";

grant delete on table "public"."resources" to "service_role";

grant insert on table "public"."resources" to "service_role";

grant references on table "public"."resources" to "service_role";

grant select on table "public"."resources" to "service_role";

grant trigger on table "public"."resources" to "service_role";

grant truncate on table "public"."resources" to "service_role";

grant update on table "public"."resources" to "service_role";

grant delete on table "public"."user_tokens" to "anon";

grant insert on table "public"."user_tokens" to "anon";

grant references on table "public"."user_tokens" to "anon";

grant select on table "public"."user_tokens" to "anon";

grant trigger on table "public"."user_tokens" to "anon";

grant truncate on table "public"."user_tokens" to "anon";

grant update on table "public"."user_tokens" to "anon";

grant delete on table "public"."user_tokens" to "authenticated";

grant insert on table "public"."user_tokens" to "authenticated";

grant references on table "public"."user_tokens" to "authenticated";

grant select on table "public"."user_tokens" to "authenticated";

grant trigger on table "public"."user_tokens" to "authenticated";

grant truncate on table "public"."user_tokens" to "authenticated";

grant update on table "public"."user_tokens" to "authenticated";

grant delete on table "public"."user_tokens" to "service_role";

grant insert on table "public"."user_tokens" to "service_role";

grant references on table "public"."user_tokens" to "service_role";

grant select on table "public"."user_tokens" to "service_role";

grant trigger on table "public"."user_tokens" to "service_role";

grant truncate on table "public"."user_tokens" to "service_role";

grant update on table "public"."user_tokens" to "service_role";

CREATE TRIGGER set_branch_timestamps BEFORE INSERT OR UPDATE ON public.branch FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_branch_user_tracking BEFORE INSERT OR UPDATE ON public.branch FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_compute_timestamps BEFORE INSERT OR UPDATE ON public.compute FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_compute_user_tracking BEFORE INSERT OR UPDATE ON public.compute FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_data_clone_timestamps BEFORE INSERT OR UPDATE ON public.data_clone FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_data_clone_user_tracking BEFORE INSERT OR UPDATE ON public.data_clone FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_data_snapshot_timestamps BEFORE INSERT OR UPDATE ON public.data_snapshot FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_data_snapshot_user_tracking BEFORE INSERT OR UPDATE ON public.data_snapshot FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_db_role_timestamps BEFORE INSERT OR UPDATE ON public.db_role FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_db_role_user_tracking BEFORE INSERT OR UPDATE ON public.db_role FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER create_deployment_settings_on_deployment_request AFTER INSERT ON public.deployment_request FOR EACH ROW EXECUTE FUNCTION public.create_deployment_settings();

CREATE TRIGGER set_deployment_random_port_trigger BEFORE INSERT ON public.deployment_request FOR EACH ROW EXECUTE FUNCTION public.set_deployment_random_port();

CREATE TRIGGER set_deployment_request_timestamps BEFORE INSERT OR UPDATE ON public.deployment_request FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_deployment_request_user_tracking BEFORE INSERT OR UPDATE ON public.deployment_request FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_deployment_settings_timestamps BEFORE INSERT OR UPDATE ON public.deployment_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_deployment_settings_user_tracking BEFORE INSERT OR UPDATE ON public.deployment_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_deployment_settings_catalog_timestamps BEFORE INSERT OR UPDATE ON public.deployment_settings_catalog FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_deployment_settings_catalog_user_tracking BEFORE INSERT OR UPDATE ON public.deployment_settings_catalog FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_image_provider_catalog_timestamps BEFORE INSERT OR UPDATE ON public.image_provider_catalog FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_image_provider_catalog_user_tracking BEFORE INSERT OR UPDATE ON public.image_provider_catalog FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_node_timestamps BEFORE INSERT OR UPDATE ON public.node FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_node_user_tracking BEFORE INSERT OR UPDATE ON public.node FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_performance_profile_timestamps BEFORE INSERT OR UPDATE ON public.performance_profile FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_performance_profile_user_tracking BEFORE INSERT OR UPDATE ON public.performance_profile FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_resources_timestamps BEFORE INSERT OR UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_resources_user_tracking BEFORE INSERT OR UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_user_tokens_timestamps BEFORE INSERT OR UPDATE ON public.user_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_user_tokens_user_tracking BEFORE INSERT OR UPDATE ON public.user_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();


