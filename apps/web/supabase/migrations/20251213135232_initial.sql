create extension if not exists "pg_cron" with schema "pg_catalog";

create schema if not exists "public";

create extension if not exists "unaccent" with schema "public";

create type "public"."app_permissions" as enum ('roles.manage', 'billing.manage', 'settings.manage', 'members.manage', 'invites.manage', 'projects.manage', 'datasources.manage', 'datasources.publish', 'notebooks.manage', 'notebooks.share', 'notebooks.publish', 'conversations.manage', 'conversations.share', 'conversations.publish', 'messages.manage', 'usage.view');

create type "public"."billing_provider" as enum ('stripe');

create type "public"."notification_channel" as enum ('in_app', 'email');

create type "public"."notification_type" as enum ('info', 'warning', 'error');

create type "public"."payment_status" as enum ('pending', 'succeeded', 'failed');

create type "public"."subscription_item_type" as enum ('flat', 'per_seat', 'metered');

create type "public"."subscription_status" as enum ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused');

create type "public"."invitation" as ("email" text, "role" character varying(50));

create sequence "public"."invitations_id_seq";

create sequence "public"."usage_id_collision_seq";


  create table "public"."accounts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null default auth.uid(),
    "name" character varying(255) not null,
    "email" character varying(320),
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid,
    "picture_url" character varying(1000),
    "public_data" jsonb not null default '{}'::jsonb
      );


alter table "public"."accounts" enable row level security;


  create table "public"."config" (
    "enable_team_accounts" boolean not null default true,
    "enable_account_billing" boolean not null default true,
    "enable_team_account_billing" boolean not null default true,
    "billing_provider" public.billing_provider not null default 'stripe'::public.billing_provider
      );


alter table "public"."config" enable row level security;


  create table "public"."conversation_shares" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "conversation_id" uuid not null,
    "organization_id" uuid,
    "user_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."conversation_shares" enable row level security;


  create table "public"."conversations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "project_id" uuid not null,
    "slug" text not null,
    "title" character varying(255) not null,
    "task_id" text not null,
    "datasources" jsonb not null default '[]'::jsonb,
    "is_public" boolean not null default false,
    "remixed_from" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."conversations" enable row level security;


  create table "public"."credits_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "transaction_type" text not null,
    "credits_amount" integer not null,
    "balance_before" integer not null,
    "balance_after" integer not null,
    "order_id" text,
    "usage_id" bigint,
    "project_id" uuid,
    "user_id" uuid,
    "consumption_type" text,
    "consumption_amount" numeric,
    "description" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid
      );


alter table "public"."credits_transactions" enable row level security;


  create table "public"."datasources" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "project_id" uuid not null,
    "slug" text not null,
    "name" character varying(255) not null,
    "description" text not null,
    "datasource_provider" text not null,
    "datasource_driver" text not null,
    "datasource_kind" text not null,
    "datasource_config" jsonb not null default '{}'::jsonb,
    "is_private" boolean not null default false,
    "is_public" boolean not null default false,
    "remixed_from" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."datasources" enable row level security;


  create table "public"."invitations" (
    "id" integer not null default nextval('public.invitations_id_seq'::regclass),
    "email" character varying(255) not null,
    "organization_id" uuid not null,
    "invited_by" uuid not null,
    "role" character varying(50) not null,
    "invite_token" character varying(255) not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "expires_at" timestamp with time zone not null default (CURRENT_TIMESTAMP + '7 days'::interval)
      );


alter table "public"."invitations" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "conversation_id" uuid not null,
    "content" jsonb not null default '{}'::jsonb,
    "role" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."messages" enable row level security;


  create table "public"."nonces" (
    "id" uuid not null default gen_random_uuid(),
    "client_token" text not null,
    "nonce" text not null,
    "user_id" uuid,
    "purpose" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "used_at" timestamp with time zone,
    "revoked" boolean not null default false,
    "revoked_reason" text,
    "verification_attempts" integer not null default 0,
    "last_verification_at" timestamp with time zone,
    "last_verification_ip" inet,
    "last_verification_user_agent" text,
    "metadata" jsonb default '{}'::jsonb,
    "scopes" text[] default '{}'::text[]
      );


alter table "public"."nonces" enable row level security;


  create table "public"."notebook_shares" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "notebook_id" uuid not null,
    "organization_id" uuid,
    "user_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notebook_shares" enable row level security;


  create table "public"."notebook_versions" (
    "version_id" uuid not null default extensions.uuid_generate_v4(),
    "notebook_id" uuid not null,
    "version" integer not null,
    "data" jsonb not null,
    "saved_at" timestamp with time zone not null default now()
      );


alter table "public"."notebook_versions" enable row level security;


  create table "public"."notebooks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "project_id" uuid not null,
    "slug" text not null,
    "title" character varying(255) not null,
    "description" text,
    "datasources" jsonb not null default '[]'::jsonb,
    "cells" jsonb not null default '[]'::jsonb,
    "version" integer not null default 1,
    "is_public" boolean not null default false,
    "remixed_from" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."notebooks" enable row level security;


  create table "public"."notifications" (
    "id" bigint generated always as identity not null,
    "account_id" uuid not null,
    "type" public.notification_type not null default 'info'::public.notification_type,
    "body" character varying(5000) not null,
    "link" character varying(255),
    "channel" public.notification_channel not null default 'in_app'::public.notification_channel,
    "dismissed" boolean not null default false,
    "expires_at" timestamp with time zone default (now() + '1 mon'::interval),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."order_items" (
    "id" text not null,
    "order_id" text not null,
    "product_id" text not null,
    "variant_id" text not null,
    "price_amount" numeric,
    "quantity" integer not null default 1,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" text not null,
    "organization_id" uuid not null,
    "customer_id" text not null,
    "status" public.payment_status not null,
    "billing_provider" public.billing_provider not null,
    "total_amount" numeric not null,
    "currency" character varying(3) not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."orders" enable row level security;


  create table "public"."organization_memberships" (
    "user_id" uuid not null,
    "organization_id" uuid not null,
    "account_role" character varying(50) not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."organization_memberships" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "slug" text not null,
    "name" character varying(255) not null,
    "email" character varying(320),
    "picture_url" character varying(1000),
    "user_id" uuid not null default auth.uid(),
    "credits_balance" integer not null default 0,
    "credits_total_purchased" integer not null default 0,
    "credits_total_consumed" integer not null default 0,
    "credits_total_allocated" integer not null default 0,
    "public_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."organizations" enable row level security;


  create table "public"."project_quotas" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "project_id" uuid not null,
    "credits_allocated" integer not null default 0,
    "credits_used" integer not null default 0,
    "credits_remaining" integer generated always as ((credits_allocated - credits_used)) stored,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."project_quotas" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "organization_id" uuid not null,
    "slug" text not null,
    "name" character varying(255) not null,
    "description" text,
    "status" text default 'active'::text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."projects" enable row level security;


  create table "public"."role_permissions" (
    "id" bigint generated by default as identity not null,
    "role" character varying(50) not null,
    "permission" public.app_permissions not null
      );


alter table "public"."role_permissions" enable row level security;


  create table "public"."roles" (
    "name" character varying(50) not null,
    "hierarchy_level" integer not null
      );


alter table "public"."roles" enable row level security;


  create table "public"."subscription_items" (
    "id" character varying(255) not null,
    "subscription_id" text not null,
    "product_id" character varying(255) not null,
    "variant_id" character varying(255) not null,
    "type" public.subscription_item_type not null,
    "price_amount" numeric,
    "quantity" integer not null default 1,
    "interval" character varying(255) not null,
    "interval_count" integer not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."subscription_items" enable row level security;


  create table "public"."subscriptions" (
    "id" text not null,
    "organization_id" uuid not null,
    "customer_id" text not null,
    "status" public.subscription_status not null,
    "active" boolean not null,
    "billing_provider" public.billing_provider not null,
    "cancel_at_period_end" boolean not null,
    "currency" character varying(3) not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "period_starts_at" timestamp with time zone not null,
    "period_ends_at" timestamp with time zone not null,
    "trial_starts_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."usage" (
    "id" bigint not null,
    "conversation_id" uuid not null,
    "project_id" uuid not null,
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "model" text not null,
    "input_tokens" integer not null default 0,
    "output_tokens" integer not null default 0,
    "total_tokens" integer not null default 0,
    "reasoning_tokens" integer not null default 0,
    "cached_input_tokens" integer not null default 0,
    "context_size" integer not null default 0,
    "credits_cap" integer not null default 0,
    "credits_used" integer not null default 0,
    "cpu" real not null default 0,
    "memory" real not null default 0,
    "network" real not null default 0,
    "gpu" real not null default 0,
    "storage" real not null default 0
      );


alter table "public"."usage" enable row level security;


  create table "public"."user_quotas" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "credits_allocated" integer not null default 0,
    "credits_used" integer not null default 0,
    "credits_remaining" integer generated always as ((credits_allocated - credits_used)) stored,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_quotas" enable row level security;


  create table "public"."volume_pricing_tiers" (
    "id" uuid not null default gen_random_uuid(),
    "min_amount_cents" integer not null,
    "max_amount_cents" integer,
    "credits_multiplier" numeric(10,4) not null default 1.0,
    "tier_name" text,
    "description" text,
    "is_active" boolean default true,
    "priority" integer default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."volume_pricing_tiers" enable row level security;

alter sequence "public"."invitations_id_seq" owned by "public"."invitations"."id";

CREATE UNIQUE INDEX accounts_email_key ON public.accounts USING btree (email);

CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id);

CREATE UNIQUE INDEX accounts_user_id_key ON public.accounts USING btree (user_id);

CREATE UNIQUE INDEX conversation_shares_conversation_id_organization_id_user_id_key ON public.conversation_shares USING btree (conversation_id, organization_id, user_id);

CREATE UNIQUE INDEX conversation_shares_pkey ON public.conversation_shares USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX credits_transactions_pkey ON public.credits_transactions USING btree (id);

CREATE UNIQUE INDEX datasources_pkey ON public.datasources USING btree (id);

CREATE INDEX idx_nonces_status ON public.nonces USING btree (client_token, user_id, purpose, expires_at) WHERE ((used_at IS NULL) AND (revoked = false));

CREATE INDEX idx_nonces_verify_lookup ON public.nonces USING btree (purpose, expires_at DESC, user_id) WHERE ((used_at IS NULL) AND (revoked = false));

CREATE INDEX idx_notifications_account_dismissed ON public.notifications USING btree (account_id, dismissed, expires_at);

CREATE UNIQUE INDEX invitations_email_organization_id_key ON public.invitations USING btree (email, organization_id);

CREATE UNIQUE INDEX invitations_invite_token_key ON public.invitations USING btree (invite_token);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

CREATE INDEX ix_accounts_user_id ON public.accounts USING btree (user_id);

CREATE INDEX ix_conversation_shares_conversation_id ON public.conversation_shares USING btree (conversation_id);

CREATE INDEX ix_conversation_shares_organization_id ON public.conversation_shares USING btree (organization_id);

CREATE INDEX ix_conversation_shares_user_id ON public.conversation_shares USING btree (user_id);

CREATE INDEX ix_conversations_project_id ON public.conversations USING btree (project_id);

CREATE INDEX ix_conversations_slug ON public.conversations USING btree (slug);

CREATE INDEX ix_conversations_task_id ON public.conversations USING btree (task_id);

CREATE INDEX ix_credits_transactions_created_at ON public.credits_transactions USING btree (created_at DESC);

CREATE INDEX ix_credits_transactions_order ON public.credits_transactions USING btree (order_id) WHERE (order_id IS NOT NULL);

CREATE INDEX ix_credits_transactions_org_type ON public.credits_transactions USING btree (organization_id, transaction_type);

CREATE INDEX ix_credits_transactions_project ON public.credits_transactions USING btree (project_id) WHERE (project_id IS NOT NULL);

CREATE INDEX ix_credits_transactions_usage ON public.credits_transactions USING btree (usage_id) WHERE (usage_id IS NOT NULL);

CREATE INDEX ix_datasources_project_id ON public.datasources USING btree (project_id);

CREATE INDEX ix_datasources_slug ON public.datasources USING btree (slug);

CREATE INDEX ix_invitations_organization_id ON public.invitations USING btree (organization_id);

CREATE INDEX ix_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX ix_messages_created_at ON public.messages USING btree (conversation_id, created_at);

CREATE INDEX ix_notebook_shares_notebook_id ON public.notebook_shares USING btree (notebook_id);

CREATE INDEX ix_notebook_shares_organization_id ON public.notebook_shares USING btree (organization_id);

CREATE INDEX ix_notebook_shares_user_id ON public.notebook_shares USING btree (user_id);

CREATE INDEX ix_notebook_versions_notebook_id ON public.notebook_versions USING btree (notebook_id);

CREATE INDEX ix_notebook_versions_version ON public.notebook_versions USING btree (notebook_id, version);

CREATE INDEX ix_notebooks_project_id ON public.notebooks USING btree (project_id);

CREATE INDEX ix_notebooks_slug ON public.notebooks USING btree (slug);

CREATE INDEX ix_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX ix_orders_organization_id ON public.orders USING btree (organization_id);

CREATE INDEX ix_organization_memberships_account_role ON public.organization_memberships USING btree (account_role);

CREATE INDEX ix_organization_memberships_organization_id ON public.organization_memberships USING btree (organization_id);

CREATE INDEX ix_organization_memberships_user_id ON public.organization_memberships USING btree (user_id);

CREATE INDEX ix_organizations_slug ON public.organizations USING btree (slug);

CREATE INDEX ix_organizations_user_id ON public.organizations USING btree (user_id);

CREATE INDEX ix_project_quotas_org ON public.project_quotas USING btree (organization_id);

CREATE INDEX ix_project_quotas_project ON public.project_quotas USING btree (project_id);

CREATE INDEX ix_projects_organization_id ON public.projects USING btree (organization_id);

CREATE INDEX ix_projects_slug ON public.projects USING btree (slug);

CREATE INDEX ix_role_permissions_role ON public.role_permissions USING btree (role);

CREATE INDEX ix_subscription_items_subscription_id ON public.subscription_items USING btree (subscription_id);

CREATE INDEX ix_subscriptions_organization_id ON public.subscriptions USING btree (organization_id);

CREATE INDEX ix_usage_conversation_id ON public.usage USING btree (conversation_id);

CREATE INDEX ix_usage_id ON public.usage USING btree (id DESC);

CREATE INDEX ix_usage_organization_id ON public.usage USING btree (organization_id);

CREATE INDEX ix_usage_project_id ON public.usage USING btree (project_id);

CREATE INDEX ix_usage_user_id ON public.usage USING btree (user_id);

CREATE INDEX ix_user_quotas_org ON public.user_quotas USING btree (organization_id);

CREATE INDEX ix_user_quotas_user ON public.user_quotas USING btree (user_id);

CREATE INDEX ix_volume_pricing_tiers_active ON public.volume_pricing_tiers USING btree (is_active, priority DESC);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX nonces_pkey ON public.nonces USING btree (id);

CREATE UNIQUE INDEX notebook_shares_notebook_id_organization_id_user_id_key ON public.notebook_shares USING btree (notebook_id, organization_id, user_id);

CREATE UNIQUE INDEX notebook_shares_pkey ON public.notebook_shares USING btree (id);

CREATE UNIQUE INDEX notebook_versions_pkey ON public.notebook_versions USING btree (version_id);

CREATE UNIQUE INDEX notebooks_pkey ON public.notebooks USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX order_items_order_id_product_id_variant_id_key ON public.order_items USING btree (order_id, product_id, variant_id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX organization_memberships_pkey ON public.organization_memberships USING btree (user_id, organization_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX project_quotas_pkey ON public.project_quotas USING btree (id);

CREATE UNIQUE INDEX project_quotas_project_id_key ON public.project_quotas USING btree (project_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id);

CREATE UNIQUE INDEX role_permissions_role_permission_key ON public.role_permissions USING btree (role, permission);

CREATE UNIQUE INDEX roles_hierarchy_level_key ON public.roles USING btree (hierarchy_level);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (name);

CREATE UNIQUE INDEX subscription_items_pkey ON public.subscription_items USING btree (id);

CREATE UNIQUE INDEX subscription_items_subscription_id_product_id_variant_id_key ON public.subscription_items USING btree (subscription_id, product_id, variant_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX unique_conversations_slug_per_project ON public.conversations USING btree (project_id, slug);

CREATE UNIQUE INDEX unique_datasources_slug_per_project ON public.datasources USING btree (project_id, slug);

CREATE UNIQUE INDEX unique_notebooks_slug_per_project ON public.notebooks USING btree (project_id, slug);

CREATE UNIQUE INDEX unique_organizations_slug ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX unique_projects_slug_per_organization ON public.projects USING btree (organization_id, slug);

CREATE UNIQUE INDEX usage_pkey ON public.usage USING btree (id);

CREATE UNIQUE INDEX user_quotas_organization_id_user_id_key ON public.user_quotas USING btree (organization_id, user_id);

CREATE UNIQUE INDEX user_quotas_pkey ON public.user_quotas USING btree (id);

CREATE UNIQUE INDEX volume_pricing_tiers_pkey ON public.volume_pricing_tiers USING btree (id);

alter table "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "public"."conversation_shares" add constraint "conversation_shares_pkey" PRIMARY KEY using index "conversation_shares_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_pkey" PRIMARY KEY using index "credits_transactions_pkey";

alter table "public"."datasources" add constraint "datasources_pkey" PRIMARY KEY using index "datasources_pkey";

alter table "public"."invitations" add constraint "invitations_pkey" PRIMARY KEY using index "invitations_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."nonces" add constraint "nonces_pkey" PRIMARY KEY using index "nonces_pkey";

alter table "public"."notebook_shares" add constraint "notebook_shares_pkey" PRIMARY KEY using index "notebook_shares_pkey";

alter table "public"."notebook_versions" add constraint "notebook_versions_pkey" PRIMARY KEY using index "notebook_versions_pkey";

alter table "public"."notebooks" add constraint "notebooks_pkey" PRIMARY KEY using index "notebooks_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_pkey" PRIMARY KEY using index "organization_memberships_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."project_quotas" add constraint "project_quotas_pkey" PRIMARY KEY using index "project_quotas_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."role_permissions" add constraint "role_permissions_pkey" PRIMARY KEY using index "role_permissions_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."subscription_items" add constraint "subscription_items_pkey" PRIMARY KEY using index "subscription_items_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."usage" add constraint "usage_pkey" PRIMARY KEY using index "usage_pkey";

alter table "public"."user_quotas" add constraint "user_quotas_pkey" PRIMARY KEY using index "user_quotas_pkey";

alter table "public"."volume_pricing_tiers" add constraint "volume_pricing_tiers_pkey" PRIMARY KEY using index "volume_pricing_tiers_pkey";

alter table "public"."accounts" add constraint "accounts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."accounts" validate constraint "accounts_created_by_fkey";

alter table "public"."accounts" add constraint "accounts_email_key" UNIQUE using index "accounts_email_key";

alter table "public"."accounts" add constraint "accounts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."accounts" validate constraint "accounts_updated_by_fkey";

alter table "public"."accounts" add constraint "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_user_id_fkey";

alter table "public"."accounts" add constraint "accounts_user_id_key" UNIQUE using index "accounts_user_id_key";

alter table "public"."conversation_shares" add constraint "conversation_shares_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_shares" validate constraint "conversation_shares_conversation_id_fkey";

alter table "public"."conversation_shares" add constraint "conversation_shares_conversation_id_organization_id_user_id_key" UNIQUE using index "conversation_shares_conversation_id_organization_id_user_id_key";

alter table "public"."conversation_shares" add constraint "conversation_shares_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_shares" validate constraint "conversation_shares_organization_id_fkey";

alter table "public"."conversation_shares" add constraint "conversation_shares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_shares" validate constraint "conversation_shares_user_id_fkey";

alter table "public"."conversations" add constraint "conversations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_created_by_fkey";

alter table "public"."conversations" add constraint "conversations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "conversations_project_id_fkey";

alter table "public"."conversations" add constraint "conversations_remixed_from_fkey" FOREIGN KEY (remixed_from) REFERENCES public.conversations(id) ON DELETE SET NULL not valid;

alter table "public"."conversations" validate constraint "conversations_remixed_from_fkey";

alter table "public"."conversations" add constraint "conversations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_updated_by_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_consumption_type_check" CHECK ((consumption_type = ANY (ARRAY['storage'::text, 'tokens'::text, 'cpu'::text, 'gpu'::text, 'network'::text]))) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_consumption_type_check";

alter table "public"."credits_transactions" add constraint "credits_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_created_by_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_order_id_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_organization_id_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_project_id_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['purchase'::text, 'consumption'::text, 'allocation'::text, 'deallocation'::text, 'adjustment'::text]))) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_transaction_type_check";

alter table "public"."credits_transactions" add constraint "credits_transactions_usage_id_fkey" FOREIGN KEY (usage_id) REFERENCES public.usage(id) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_usage_id_fkey";

alter table "public"."credits_transactions" add constraint "credits_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."credits_transactions" validate constraint "credits_transactions_user_id_fkey";

alter table "public"."datasources" add constraint "datasources_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."datasources" validate constraint "datasources_created_by_fkey";

alter table "public"."datasources" add constraint "datasources_private_public_exclusive" CHECK ((NOT ((is_private = true) AND (is_public = true)))) not valid;

alter table "public"."datasources" validate constraint "datasources_private_public_exclusive";

alter table "public"."datasources" add constraint "datasources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."datasources" validate constraint "datasources_project_id_fkey";

alter table "public"."datasources" add constraint "datasources_remixed_from_fkey" FOREIGN KEY (remixed_from) REFERENCES public.datasources(id) ON DELETE SET NULL not valid;

alter table "public"."datasources" validate constraint "datasources_remixed_from_fkey";

alter table "public"."datasources" add constraint "datasources_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."datasources" validate constraint "datasources_updated_by_fkey";

alter table "public"."invitations" add constraint "invitations_email_organization_id_key" UNIQUE using index "invitations_email_organization_id_key";

alter table "public"."invitations" add constraint "invitations_invite_token_key" UNIQUE using index "invitations_invite_token_key";

alter table "public"."invitations" add constraint "invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_invited_by_fkey";

alter table "public"."invitations" add constraint "invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_organization_id_fkey";

alter table "public"."invitations" add constraint "invitations_role_fkey" FOREIGN KEY (role) REFERENCES public.roles(name) not valid;

alter table "public"."invitations" validate constraint "invitations_role_fkey";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."messages" validate constraint "messages_created_by_fkey";

alter table "public"."messages" add constraint "messages_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."messages" validate constraint "messages_updated_by_fkey";

alter table "public"."nonces" add constraint "nonces_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nonces" validate constraint "nonces_user_id_fkey";

alter table "public"."notebook_shares" add constraint "notebook_shares_notebook_id_fkey" FOREIGN KEY (notebook_id) REFERENCES public.notebooks(id) ON DELETE CASCADE not valid;

alter table "public"."notebook_shares" validate constraint "notebook_shares_notebook_id_fkey";

alter table "public"."notebook_shares" add constraint "notebook_shares_notebook_id_organization_id_user_id_key" UNIQUE using index "notebook_shares_notebook_id_organization_id_user_id_key";

alter table "public"."notebook_shares" add constraint "notebook_shares_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."notebook_shares" validate constraint "notebook_shares_organization_id_fkey";

alter table "public"."notebook_shares" add constraint "notebook_shares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notebook_shares" validate constraint "notebook_shares_user_id_fkey";

alter table "public"."notebook_versions" add constraint "notebook_versions_notebook_id_fkey" FOREIGN KEY (notebook_id) REFERENCES public.notebooks(id) ON DELETE CASCADE not valid;

alter table "public"."notebook_versions" validate constraint "notebook_versions_notebook_id_fkey";

alter table "public"."notebooks" add constraint "notebooks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."notebooks" validate constraint "notebooks_created_by_fkey";

alter table "public"."notebooks" add constraint "notebooks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."notebooks" validate constraint "notebooks_project_id_fkey";

alter table "public"."notebooks" add constraint "notebooks_remixed_from_fkey" FOREIGN KEY (remixed_from) REFERENCES public.notebooks(id) ON DELETE SET NULL not valid;

alter table "public"."notebooks" validate constraint "notebooks_remixed_from_fkey";

alter table "public"."notebooks" add constraint "notebooks_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."notebooks" validate constraint "notebooks_updated_by_fkey";

alter table "public"."notifications" add constraint "notifications_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_account_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_product_id_variant_id_key" UNIQUE using index "order_items_order_id_product_id_variant_id_key";

alter table "public"."orders" add constraint "orders_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_organization_id_fkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_account_role_fkey" FOREIGN KEY (account_role) REFERENCES public.roles(name) not valid;

alter table "public"."organization_memberships" validate constraint "organization_memberships_account_role_fkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."organization_memberships" validate constraint "organization_memberships_created_by_fkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_memberships" validate constraint "organization_memberships_organization_id_fkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."organization_memberships" validate constraint "organization_memberships_updated_by_fkey";

alter table "public"."organization_memberships" add constraint "organization_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_memberships" validate constraint "organization_memberships_user_id_fkey";

alter table "public"."organizations" add constraint "organizations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."organizations" validate constraint "organizations_created_by_fkey";

alter table "public"."organizations" add constraint "organizations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."organizations" validate constraint "organizations_updated_by_fkey";

alter table "public"."organizations" add constraint "organizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organizations" validate constraint "organizations_user_id_fkey";

alter table "public"."project_quotas" add constraint "project_quotas_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."project_quotas" validate constraint "project_quotas_organization_id_fkey";

alter table "public"."project_quotas" add constraint "project_quotas_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_quotas" validate constraint "project_quotas_project_id_fkey";

alter table "public"."project_quotas" add constraint "project_quotas_project_id_key" UNIQUE using index "project_quotas_project_id_key";

alter table "public"."projects" add constraint "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."projects" validate constraint "projects_created_by_fkey";

alter table "public"."projects" add constraint "projects_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_organization_id_fkey";

alter table "public"."projects" add constraint "projects_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."projects" validate constraint "projects_updated_by_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_role_fkey" FOREIGN KEY (role) REFERENCES public.roles(name) not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_role_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_role_permission_key" UNIQUE using index "role_permissions_role_permission_key";

alter table "public"."roles" add constraint "roles_hierarchy_level_check" CHECK ((hierarchy_level > 0)) not valid;

alter table "public"."roles" validate constraint "roles_hierarchy_level_check";

alter table "public"."roles" add constraint "roles_hierarchy_level_key" UNIQUE using index "roles_hierarchy_level_key";

alter table "public"."subscription_items" add constraint "subscription_items_interval_count_check" CHECK ((interval_count > 0)) not valid;

alter table "public"."subscription_items" validate constraint "subscription_items_interval_count_check";

alter table "public"."subscription_items" add constraint "subscription_items_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE not valid;

alter table "public"."subscription_items" validate constraint "subscription_items_subscription_id_fkey";

alter table "public"."subscription_items" add constraint "subscription_items_subscription_id_product_id_variant_id_key" UNIQUE using index "subscription_items_subscription_id_product_id_variant_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_organization_id_fkey";

alter table "public"."usage" add constraint "usage_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_conversation_id_fkey";

alter table "public"."usage" add constraint "usage_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_organization_id_fkey";

alter table "public"."usage" add constraint "usage_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_project_id_fkey";

alter table "public"."usage" add constraint "usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_user_id_fkey";

alter table "public"."user_quotas" add constraint "user_quotas_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."user_quotas" validate constraint "user_quotas_organization_id_fkey";

alter table "public"."user_quotas" add constraint "user_quotas_organization_id_user_id_key" UNIQUE using index "user_quotas_organization_id_user_id_key";

alter table "public"."user_quotas" add constraint "user_quotas_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_quotas" validate constraint "user_quotas_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_invitation(token text, user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    target_organization_id uuid;
    target_role varchar(50);
begin
    select
        organization_id,
        role into target_organization_id,
        target_role
    from
        public.invitations
    where
        invite_token = token
        and expires_at > now();

    if not found then
        raise exception 'Invalid or expired invitation token';
    end if;

    insert into public.organization_memberships(
        user_id,
        organization_id,
        account_role)
    values (
        accept_invitation.user_id,
        target_organization_id,
        target_role);

    delete from public.invitations
    where invite_token = token;

    return target_organization_id;
end;

$function$
;

CREATE OR REPLACE FUNCTION public.add_credits_to_organization(target_organization_id uuid, credits_amount integer, order_id text DEFAULT NULL::text, description text DEFAULT NULL::text)
 RETURNS public.credits_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_balance integer;
  new_balance integer;
  transaction_record public.credits_transactions;
begin
  -- Get current balance (with row lock to prevent race conditions)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if not found then
    raise exception 'Organization not found: %', target_organization_id;
  end if;
  
  -- Calculate new balance
  new_balance := current_balance + credits_amount;
  
  -- Update organization balance atomically
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_purchased = credits_total_purchased + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    order_id,
    description,
    created_by
  ) values (
    target_organization_id,
    'purchase',
    credits_amount,
    current_balance,
    new_balance,
    order_id,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.add_invitations_to_organization(org_slug text, invitations public.invitation[])
 RETURNS public.invitations[]
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    new_invitation public.invitations;
    all_invitations public.invitations[] := array[]::public.invitations[];
    invite_token text;
    email text;
    role varchar(50);
begin
    FOREACH email,
    role in array invitations loop
        invite_token := extensions.uuid_generate_v4();

        insert into public.invitations(
            email,
            organization_id,
            invited_by,
            role,
            invite_token)
        values (
            email,
(
                select
                    id
                from
                    public.organizations
                where
                    slug = org_slug), auth.uid(), role, invite_token)
    returning
        * into new_invitation;

        all_invitations := array_append(all_invitations, new_invitation);

    end loop;

    return all_invitations;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.allocate_credits_quota(target_organization_id uuid, credits_amount integer, target_project_id uuid DEFAULT NULL::uuid, target_user_id uuid DEFAULT NULL::uuid, description text DEFAULT NULL::text)
 RETURNS public.credits_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_balance integer;
  new_balance integer;
  transaction_record public.credits_transactions;
begin
  -- Validate: must specify either project or user, not both
  if (target_project_id is null and target_user_id is null) or 
     (target_project_id is not null and target_user_id is not null) then
    raise exception 'Must specify either project_id or user_id, not both';
  end if;
  
  -- Get current balance (with lock)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if current_balance < credits_amount then
    raise exception 'Insufficient credits for allocation. Balance: %, Requested: %', 
      current_balance, credits_amount;
  end if;
  
  new_balance := current_balance - credits_amount;
  
  -- Update organization balance
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_allocated = credits_total_allocated + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Update project quota
  if target_project_id is not null then
    insert into public.project_quotas (
      organization_id, project_id, credits_allocated, credits_used
    ) values (
      target_organization_id, target_project_id, credits_amount, 0
    )
    on conflict (project_id) 
    do update set 
      credits_allocated = project_quotas.credits_allocated + credits_amount,
      updated_at = now();
  end if;
  
  -- Update user quota
  if target_user_id is not null then
    insert into public.user_quotas (
      organization_id, user_id, credits_allocated, credits_used
    ) values (
      target_organization_id, target_user_id, credits_amount, 0
    )
    on conflict (organization_id, user_id) 
    do update set 
      credits_allocated = user_quotas.credits_allocated + credits_amount,
      updated_at = now();
  end if;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    project_id,
    user_id,
    description,
    created_by
  ) values (
    target_organization_id,
    'allocation',
    -credits_amount, -- Negative (deducted from org balance)
    current_balance,
    new_balance,
    target_project_id,
    target_user_id,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_credits_from_amount(amount_cents integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  base_credits integer;
  multiplier numeric;
  final_credits integer;
begin
  -- Base: $1 = 1 credit (amount_cents / 100)
  base_credits := amount_cents / 100;
  
  -- Find applicable tier multiplier
  select credits_multiplier into multiplier
  from public.volume_pricing_tiers
  where amount_cents >= min_amount_cents
    and (max_amount_cents is null or amount_cents <= max_amount_cents)
    and is_active = true
  order by priority desc
  limit 1;
  
  -- Default to 1.0 if no tier found
  if multiplier is null then
    multiplier := 1.0;
  end if;
  
  -- Apply multiplier
  final_credits := floor(base_credits * multiplier);
  
  return final_credits;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_action_organization_member(target_organization_id uuid, target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare permission_granted boolean;
target_user_hierarchy_level int;
current_user_hierarchy_level int;
is_org_owner boolean;
target_user_role varchar(50);
begin if target_user_id = auth.uid() then raise exception 'You cannot update your own organization membership with this function';
end if;
-- an organization owner can action any member of the organization
if public.is_organization_owner(target_organization_id) then return true;
end if;
-- check the target user is the primary owner of the organization
select exists (
    select 1
    from public.organizations
    where id = target_organization_id
      and user_id = target_user_id
  ) into is_org_owner;
if is_org_owner then raise exception 'The primary organization owner cannot be actioned';
end if;
-- validate the auth user has the required permission on the organization
-- to manage members of the organization
select public.has_permission(
    auth.uid(),
    target_organization_id,
    'members.manage'::public.app_permissions
  ) into permission_granted;
-- if the user does not have the required permission, raise an exception
if not permission_granted then raise exception 'You do not have permission to action a member from this organization';
end if;
-- get the role of the target user
select om.account_role,
  r.hierarchy_level
from public.organization_memberships as om
  join public.roles as r on om.account_role = r.name
where om.organization_id = target_organization_id
  and om.user_id = target_user_id into target_user_role,
  target_user_hierarchy_level;
-- get the hierarchy level of the current user
select r.hierarchy_level into current_user_hierarchy_level
from public.roles as r
  join public.organization_memberships as om on r.name = om.account_role
where om.organization_id = target_organization_id
  and om.user_id = auth.uid();
if target_user_role is null then raise exception 'The target user does not have a role on the organization';
end if;
if current_user_hierarchy_level is null then raise exception 'The current user does not have a role on the organization';
end if;
-- check the current user has a higher role than the target user
if current_user_hierarchy_level >= target_user_hierarchy_level then raise exception 'You do not have permission to action a member from this organization';
end if;
return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_credits(target_organization_id uuid, target_project_id uuid, target_user_id uuid, credits_amount integer, usage_id bigint, consumption_type text, consumption_amount numeric, description text DEFAULT NULL::text)
 RETURNS public.credits_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_balance integer;
  new_balance integer;
  project_quota_remaining integer;
  user_quota_remaining integer;
  transaction_record public.credits_transactions;
begin
  -- Check project quota (hard limit)
  select credits_remaining into project_quota_remaining
  from public.project_quotas
  where project_id = target_project_id and is_active = true;
  
  if project_quota_remaining is not null and project_quota_remaining < credits_amount then
    raise exception 'Project quota exceeded. Remaining: %, Requested: %', 
      project_quota_remaining, credits_amount;
  end if;
  
  -- Check user quota (hard limit)
  select credits_remaining into user_quota_remaining
  from public.user_quotas
  where organization_id = target_organization_id 
    and user_id = target_user_id 
    and is_active = true;
  
  if user_quota_remaining is not null and user_quota_remaining < credits_amount then
    raise exception 'User quota exceeded. Remaining: %, Requested: %', 
      user_quota_remaining, credits_amount;
  end if;
  
  -- Get current org balance (with lock)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if current_balance < credits_amount then
    raise exception 'Insufficient credits. Balance: %, Requested: %', 
      current_balance, credits_amount;
  end if;
  
  new_balance := current_balance - credits_amount;
  
  -- Update organization balance
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_consumed = credits_total_consumed + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Update project quota if exists
  if project_quota_remaining is not null then
    update public.project_quotas
    set credits_used = credits_used + credits_amount,
        updated_at = now()
    where project_id = target_project_id;
  end if;
  
  -- Update user quota if exists
  if user_quota_remaining is not null then
    update public.user_quotas
    set credits_used = credits_used + credits_amount,
        updated_at = now()
    where organization_id = target_organization_id and user_id = target_user_id;
  end if;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    usage_id,
    project_id,
    user_id,
    consumption_type,
    consumption_amount,
    description,
    created_by
  ) values (
    target_organization_id,
    'consumption',
    -credits_amount, -- Negative for consumption
    current_balance,
    new_balance,
    usage_id,
    target_project_id,
    target_user_id,
    consumption_type,
    consumption_amount,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_invitation(organization_id uuid, email text, role character varying)
 RETURNS public.invitations
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    new_invitation public.invitations;
    invite_token text;
begin
    invite_token := extensions.uuid_generate_v4();

    insert into public.invitations(
        email,
        organization_id,
        invited_by,
        role,
        invite_token)
    values (
        email,
        organization_id,
        auth.uid(),
        role,
        invite_token)
returning
    * into new_invitation;

    return new_invitation;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.create_nonce(p_user_id uuid DEFAULT NULL::uuid, p_purpose text DEFAULT NULL::text, p_expires_in_seconds integer DEFAULT 3600, p_metadata jsonb DEFAULT NULL::jsonb, p_scopes text[] DEFAULT NULL::text[], p_revoke_previous boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_client_token TEXT;
    v_nonce TEXT;
    v_expires_at TIMESTAMPTZ;
    v_id UUID;
    v_plaintext_token TEXT;
    v_revoked_count INTEGER;
BEGIN
    -- Revoke previous tokens for the same user and purpose if requested
    -- This only applies if a user ID is provided (not for anonymous tokens)
    IF p_revoke_previous = TRUE AND p_user_id IS NOT NULL THEN
        WITH revoked AS (
            UPDATE public.nonces
                SET
                    revoked = TRUE,
                    revoked_reason = 'Superseded by new token with same purpose'
                WHERE
                    user_id = p_user_id
                        AND purpose = p_purpose
                        AND used_at IS NULL
                        AND revoked = FALSE
                        AND expires_at > NOW()
                RETURNING 1
        )
        SELECT COUNT(*) INTO v_revoked_count FROM revoked;
    END IF;

    -- Generate a 6-digit token
    v_plaintext_token := (100000 + floor(random() * 900000))::text;
    v_client_token := extensions.crypt(v_plaintext_token, extensions.gen_salt('bf'));

    -- Still generate a secure nonce for internal use
    v_nonce := encode(extensions.gen_random_bytes(24), 'base64');
    v_nonce := extensions.crypt(v_nonce, extensions.gen_salt('bf'));

    -- Calculate expiration time
    v_expires_at := NOW() + (p_expires_in_seconds * interval '1 second');

    -- Insert the new nonce
    INSERT INTO public.nonces (
        client_token,
        nonce,
        user_id,
        expires_at,
        metadata,
        purpose,
        scopes
    )
    VALUES (
               v_client_token,
               v_nonce,
               p_user_id,
               v_expires_at,
               COALESCE(p_metadata, '{}'::JSONB),
               p_purpose,
               COALESCE(p_scopes, '{}'::TEXT[])
           )
    RETURNING id INTO v_id;

    -- Return the token information
    -- Note: returning the plaintext token, not the hash
    RETURN jsonb_build_object(
            'id', v_id,
            'token', v_plaintext_token,
            'expires_at', v_expires_at,
            'revoked_previous_count', COALESCE(v_revoked_count, 0)
           );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_config()
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    result record;
begin
    select
        *
    from
        public.config
    limit 1 into result;

    return row_to_json(result);

end;

$function$
;

CREATE OR REPLACE FUNCTION public.get_nonce_status(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_nonce public.nonces;
BEGIN
  SELECT * INTO v_nonce FROM public.nonces WHERE id = p_id;

  IF v_nonce.id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'purpose', v_nonce.purpose,
    'user_id', v_nonce.user_id,
    'created_at', v_nonce.created_at,
    'expires_at', v_nonce.expires_at,
    'used_at', v_nonce.used_at,
    'revoked', v_nonce.revoked,
    'revoked_reason', v_nonce.revoked_reason,
    'verification_attempts', v_nonce.verification_attempts,
    'last_verification_at', v_nonce.last_verification_at,
    'last_verification_ip', v_nonce.last_verification_ip,
    'is_valid', (v_nonce.used_at IS NULL AND NOT v_nonce.revoked AND v_nonce.expires_at > NOW())
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_invitations(org_slug text)
 RETURNS TABLE(id integer, email character varying, organization_id uuid, invited_by uuid, role character varying, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, inviter_name character varying, inviter_email character varying)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return query
    select
        invitation.id,
        invitation.email,
        invitation.organization_id,
        invitation.invited_by,
        invitation.role,
        invitation.created_at,
        invitation.updated_at,
        invitation.expires_at,
        org.name,
        org.email
    from
        public.invitations as invitation
        join public.organizations as org on invitation.organization_id = org.id
    where
        org.slug = org_slug;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_members(org_slug text)
 RETURNS TABLE(id uuid, user_id uuid, organization_id uuid, role character varying, role_hierarchy_level integer, organization_user_id uuid, name character varying, email character varying, picture_url character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return QUERY
    select
        acc.id,
        om.user_id,
        om.organization_id,
        om.account_role,
        r.hierarchy_level,
        o.user_id as organization_user_id,
        acc.name,
        acc.email,
        acc.picture_url,
        om.created_at,
        om.updated_at
    from
        public.organization_memberships om
        join public.organizations o on o.id = om.organization_id
        join public.accounts acc on acc.id = om.user_id
        join public.roles r on r.name = om.account_role
    where
        o.slug = org_slug;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.get_upper_system_role()
 RETURNS character varying
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    role varchar(50);
begin
    select name from public.roles
      where hierarchy_level = 1 into role;

    return role;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_active_subscription(target_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return exists (
        select
            1
        from
            public.subscriptions
        where
            organization_id = target_organization_id
            and active = true);

end;

$function$
;

CREATE OR REPLACE FUNCTION public.has_more_elevated_role(target_user_id uuid, target_account_id uuid, role_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    declare is_primary_owner boolean;
    user_role_hierarchy_level int;
    target_role_hierarchy_level int;
begin
    -- Check if the user is the primary owner of the organization
    select
        exists (
            select
                1
            from
                public.organizations
            where
                id = target_account_id
                and user_id = target_user_id) into is_primary_owner;

    -- If the user is the primary owner, they have the highest role and can
    --   perform any action
    if is_primary_owner then
        return true;
    end if;

    -- Get the hierarchy level of the user's role within the organization
    select
        hierarchy_level into user_role_hierarchy_level
    from
        public.roles
    where
        name =(
            select
                account_role
            from
                public.organization_memberships
            where
                organization_id = target_account_id
                and target_user_id = user_id);

    if user_role_hierarchy_level is null then
        return false;
    end if;

    -- Get the hierarchy level of the target role
    select
        hierarchy_level into target_role_hierarchy_level
    from
        public.roles
    where
        name = role_name;

    -- If the target role does not exist, the user cannot perform the action
    if target_role_hierarchy_level is null then
        return false;
    end if;

    -- If the user's role is higher than the target role, they can perform
    --   the action
    return user_role_hierarchy_level < target_role_hierarchy_level;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(user_id uuid, organization_id uuid, permission_name public.app_permissions)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return exists(
        select
            1
        from
            public.organization_memberships
	    join public.role_permissions on
		organization_memberships.account_role =
		role_permissions.role
        where
            organization_memberships.user_id = has_permission.user_id
            and organization_memberships.organization_id = has_permission.organization_id
            and role_permissions.permission = has_permission.permission_name);

end;

$function$
;

CREATE OR REPLACE FUNCTION public.has_role_on_organization(organization_id uuid, account_role character varying DEFAULT NULL::character varying)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(
    select 1
    from public.organization_memberships membership
    where membership.user_id = (
        select auth.uid()
      )
      and membership.organization_id = has_role_on_organization.organization_id
      and(
        (
          membership.account_role = has_role_on_organization.account_role
          or has_role_on_organization.account_role is null
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_same_role_hierarchy_level(target_user_id uuid, target_account_id uuid, role_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    is_primary_owner boolean;
    user_role_hierarchy_level int;
    target_role_hierarchy_level int;
begin
    -- Check if the user is the primary owner of the organization
    select
        exists (
            select
                1
            from
                public.organizations
            where
                id = target_account_id
                and user_id = target_user_id) into is_primary_owner;

    -- If the user is the primary owner, they have the highest role and can perform any action
    if is_primary_owner then
        return true;
    end if;

    -- Get the hierarchy level of the user's role within the organization
    select
        hierarchy_level into user_role_hierarchy_level
    from
        public.roles
    where
        name =(
            select
                account_role
            from
                public.organization_memberships
            where
                organization_id = target_account_id
                and target_user_id = user_id);

    -- If the user does not have a role in the organization, they cannot perform the action
    if user_role_hierarchy_level is null then
        return false;
    end if;

    -- Get the hierarchy level of the target role
    select
        hierarchy_level into target_role_hierarchy_level
    from
        public.roles
    where
        name = role_name;

    -- If the target role does not exist, the user cannot perform the action
    if target_role_hierarchy_level is null then
        return false;
    end if;

   -- check the user's role hierarchy level is the same as the target role
    return user_role_hierarchy_level = target_role_hierarchy_level;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.has_valid_invitation_for_organization(target_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare user_email text;
has_invitation boolean;
begin -- Get user email from JWT or auth.users
user_email := coalesce(
  auth.jwt()->>'email',
  (
    select email
    from auth.users
    where id = auth.uid()
  )
);
-- Check if invitation exists (bypassing RLS due to SECURITY DEFINER)
select exists (
    select 1
    from public.invitations
    where invitations.organization_id = has_valid_invitation_for_organization.target_organization_id
      and invitations.email = user_email
      and invitations.expires_at > now()
  ) into has_invitation;
return has_invitation;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_aal2()
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    is_aal2 boolean;
begin
    select auth.jwt() ->> 'aal' = 'aal2' into is_aal2;

    return coalesce(is_aal2, false);
end
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_owner(account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
    select
        exists(
            select
                1
            from
                public.accounts
            where
                id = is_account_owner.account_id
                and user_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.is_conversation_owner(target_conversation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  is_owner boolean;
begin
  -- Check if the current user is the owner (bypassing RLS due to SECURITY DEFINER)
  select exists (
    select 1
    from public.conversations
    where id = target_conversation_id
      and created_by = auth.uid()
  ) into is_owner;
  
  return is_owner;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_mfa_compliant()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    return array[(select auth.jwt()->>'aal')] <@ (
        select
            case
                when count(id) > 0 then array['aal2']
                else array['aal1', 'aal2']
                end as aal
        from auth.mfa_factors
        where ((select auth.uid()) = auth.mfa_factors.user_id) and auth.mfa_factors.status = 'verified'
    );
end
$function$
;

CREATE OR REPLACE FUNCTION public.is_notebook_owner(target_notebook_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  is_owner boolean;
begin
  -- Check if the current user is the owner (bypassing RLS due to SECURITY DEFINER)
  select exists (
    select 1
    from public.notebooks
    where id = target_notebook_id
      and created_by = auth.uid()
  ) into is_owner;
  
  return is_owner;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_organization_member(organization_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(
    select 1
    from public.organization_memberships membership
    where public.has_role_on_organization(organization_id)
      and membership.user_id = is_organization_member.user_id
      and membership.organization_id = is_organization_member.organization_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_organization_owner(organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
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

CREATE OR REPLACE FUNCTION public.is_set(field_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    result boolean;
begin
    execute format('select %I from public.config limit 1', field_name) into result;

    return result;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    is_super_admin boolean;
begin
    if not public.is_aal2() then
        return false;
    end if;

    select (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin' into is_super_admin;

    return coalesce(is_super_admin, false);
end
$function$
;

CREATE OR REPLACE FUNCTION public.organization_workspace(org_slug text)
 RETURNS TABLE(id uuid, name character varying, picture_url character varying, slug text, role character varying, role_hierarchy_level integer, user_id uuid, subscription_status public.subscription_status, permissions public.app_permissions[])
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return QUERY
    select
        org.id,
        org.name,
        org.picture_url,
        org.slug,
        organization_memberships.account_role,
        roles.hierarchy_level,
        org.user_id,
        subscriptions.status,
        array_agg(role_permissions.permission)
    from
        public.organizations org
        join public.organization_memberships on org.id = organization_memberships.organization_id
        left join public.subscriptions on org.id = subscriptions.organization_id
        join public.roles on organization_memberships.account_role = roles.name
        left join public.role_permissions on organization_memberships.account_role = role_permissions.role
    where
        org.slug = org_slug
        and public.organization_memberships.user_id = (select auth.uid())
    group by
        org.id,
        organization_memberships.account_role,
        subscriptions.status,
        roles.hierarchy_level;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_credit_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin -- Allow non-authenticated users (service_role, SECURITY DEFINER functions) to update credits
  -- Credit management functions use SECURITY DEFINER and should be able to update credits
  if current_user in ('authenticated', 'anon') then -- Check if any credit columns are being modified
  if (
    old.credits_balance is distinct
    from new.credits_balance
      or old.credits_total_purchased is distinct
    from new.credits_total_purchased
      or old.credits_total_consumed is distinct
    from new.credits_total_consumed
      or old.credits_total_allocated is distinct
    from new.credits_total_allocated
  ) then -- Prevent authenticated users from updating credits directly
  -- Credit updates should go through dedicated functions (add_credits_to_organization, consume_credits, etc.)
  raise exception 'Credit fields cannot be updated directly. Use dedicated credit management functions instead.';
end if;
end if;
return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remix_conversation(source_conversation_id uuid, target_project_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  new_conversation_id uuid;
  source_conversation public.conversations;
begin
  -- Verify source conversation is public
  select * into source_conversation
  from public.conversations
  where id = source_conversation_id and is_public = true;
  
  if not found then
    raise exception 'Conversation not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new conversation as copy
  insert into public.conversations (
    project_id, slug, title, task_id, datasources,
    created_by, remixed_from, is_public
  )
  values (
    target_project_id,
    public.shorten_id(extensions.uuid_generate_v4()),
    source_conversation.title || ' (Remix)',
    source_conversation.task_id,
    source_conversation.datasources, -- Will need to remix referenced datasources
    auth.uid(),
    source_conversation_id,
    false -- Remixed conversations are private by default
  )
  returning id into new_conversation_id;
  
  -- Note: Messages are not copied - remixed conversations start fresh
  -- If needed, messages can be copied separately
  
  return new_conversation_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remix_datasource(source_datasource_id uuid, target_project_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  new_datasource_id uuid;
  source_datasource public.datasources;
begin
  -- Verify source datasource is public
  select * into source_datasource
  from public.datasources
  where id = source_datasource_id and is_public = true;
  
  if not found then
    raise exception 'Datasource not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new datasource as copy (without credentials - user must configure)
  insert into public.datasources (
    project_id, slug, name, description,
    datasource_provider, datasource_driver, datasource_kind,
    datasource_config, is_private, is_public, created_by, remixed_from
  )
  values (
    target_project_id,
    public.shorten_id(extensions.uuid_generate_v4()),
    source_datasource.name || ' (Remix)',
    source_datasource.description,
    source_datasource.datasource_provider,
    source_datasource.datasource_driver,
    source_datasource.datasource_kind,
    '{}'::jsonb, -- Empty config - user must configure credentials
    true, -- Remixed datasources are private by default
    false,
    auth.uid(),
    source_datasource_id
  )
  returning id into new_datasource_id;
  
  return new_datasource_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remix_notebook(source_notebook_id uuid, target_project_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  new_notebook_id uuid;
  source_notebook public.notebooks;
begin
  -- Verify source notebook is public
  select * into source_notebook
  from public.notebooks
  where id = source_notebook_id and is_public = true;
  
  if not found then
    raise exception 'Notebook not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new notebook as copy
  insert into public.notebooks (
    project_id, slug, title, description, datasources, cells, version,
    created_by, remixed_from, is_public
  )
  values (
    target_project_id,
    -- Generate new slug
    public.shorten_id(extensions.uuid_generate_v4()),
    source_notebook.title || ' (Remix)',
    source_notebook.description,
    source_notebook.datasources, -- Will need to remix referenced datasources
    source_notebook.cells,
    1, -- Reset version
    auth.uid(),
    source_notebook_id,
    false -- Remixed notebooks are private by default
  )
  returning id into new_notebook_id;
  
  return new_notebook_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_nonce(p_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  UPDATE public.nonces
  SET
    revoked = TRUE,
    revoked_reason = p_reason
  WHERE
    id = p_id
    AND used_at IS NULL
    AND NOT revoked
  RETURNING 1 INTO v_affected_rows;

  RETURN v_affected_rows > 0;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.share_organization_with_user(account_owner_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.organization_memberships om1
    inner join public.organization_memberships om2
      on om1.organization_id = om2.organization_id
    where om1.user_id = account_owner_user_id
      and om2.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.shorten_id(input_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  hash_value bigint;
  alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  char_index integer;
  temp_hash bigint;
begin
  -- Convert UUID to hash using multiple hash functions for better distribution
  hash_value := abs(hashtext(input_id::text));
  temp_hash := hash_value;
  
  -- Generate 10-character string
  for i in 1..10 loop
    char_index := (abs(temp_hash) % 62) + 1;
    result := result || substr(alphabet, char_index, 1);
    -- Rotate hash for next character
    temp_hash := (temp_hash * 33 + i)::bigint;
  end loop;
  
  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(target_organization_id uuid, new_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.trigger_set_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    if TG_OP = 'INSERT' then
        new.created_at = now();

        new.updated_at = now();

    else
        new.updated_at = now();

        new.created_at = old.created_at;

    end if;

    return NEW;

end
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_usage_timestamp_id()
 RETURNS trigger
 LANGUAGE plpgsql
 security definer
 SET search_path TO ''
AS $function$
begin
  -- Only set ID if it's not already provided or is 0/null
  if new.id is null or new.id = 0 then
    new.id := public.generate_usage_timestamp_id();
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_user_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    if TG_OP = 'INSERT' then
        new.created_by = auth.uid();
        new.updated_by = auth.uid();

    else
        new.updated_by = auth.uid();

        new.created_by = old.created_by;

    end if;

    return NEW;

end
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_order(target_organization_id uuid, target_customer_id character varying, target_order_id text, status public.payment_status, billing_provider public.billing_provider, total_amount numeric, currency character varying, line_items jsonb)
 RETURNS public.orders
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    new_order public.orders;
begin
    insert into public.orders(
        organization_id,
        customer_id,
        id,
        status,
        billing_provider,
        total_amount,
        currency)
    values (
        target_organization_id,
        target_customer_id,
        target_order_id,
        status,
        billing_provider,
        total_amount,
        currency)
on conflict (
    id)
    do update set
        status = excluded.status,
        total_amount = excluded.total_amount,
        currency = excluded.currency
    returning
        * into new_order;

    -- Upsert order items and delete ones that are not in the line_items array
    with item_data as (
        select
            (line_item ->> 'id')::varchar as line_item_id,
            (line_item ->> 'product_id')::varchar as prod_id,
            (line_item ->> 'variant_id')::varchar as var_id,
            (line_item ->> 'price_amount')::numeric as price_amt,
            (line_item ->> 'quantity')::integer as qty
        from
            jsonb_array_elements(line_items) as line_item
    ),
    line_item_ids as (
        select line_item_id from item_data
    ),
    deleted_items as (
        delete from
            public.order_items
        where
            public.order_items.order_id = new_order.id
            and public.order_items.id not in (select line_item_id from line_item_ids)
        returning *
    )
    insert into public.order_items(
        id,
        order_id,
        product_id,
        variant_id,
        price_amount,
        quantity)
    select
        line_item_id,
        target_order_id,
        prod_id,
        var_id,
        price_amt,
        qty
    from
        item_data
    on conflict (id)
        do update set
            price_amount = excluded.price_amount,
            product_id = excluded.product_id,
            variant_id = excluded.variant_id,
            quantity = excluded.quantity;

    return new_order;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.upsert_subscription(target_organization_id uuid, target_customer_id character varying, target_subscription_id text, active boolean, status public.subscription_status, billing_provider public.billing_provider, cancel_at_period_end boolean, currency character varying, period_starts_at timestamp with time zone, period_ends_at timestamp with time zone, line_items jsonb, trial_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, trial_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS public.subscriptions
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    new_subscription public.subscriptions;
begin
    insert into public.subscriptions(
        organization_id,
        customer_id,
        id,
        active,
        status,
        billing_provider,
        cancel_at_period_end,
        currency,
        period_starts_at,
        period_ends_at,
        trial_starts_at,
        trial_ends_at)
    values (
        target_organization_id,
        target_customer_id,
        target_subscription_id,
        active,
        status,
        billing_provider,
        cancel_at_period_end,
        currency,
        period_starts_at,
        period_ends_at,
        trial_starts_at,
        trial_ends_at)
on conflict (
    id)
    do update set
        active = excluded.active,
        status = excluded.status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        currency = excluded.currency,
        period_starts_at = excluded.period_starts_at,
        period_ends_at = excluded.period_ends_at,
        trial_starts_at = excluded.trial_starts_at,
        trial_ends_at = excluded.trial_ends_at
    returning
        * into new_subscription;

    -- Upsert subscription items and delete ones that are not in the line_items array
    with item_data as (
        select
            (line_item ->> 'id')::varchar as line_item_id,
            (line_item ->> 'product_id')::varchar as prod_id,
            (line_item ->> 'variant_id')::varchar as var_id,
            (line_item ->> 'type')::public.subscription_item_type as type,
            (line_item ->> 'price_amount')::numeric as price_amt,
            (line_item ->> 'quantity')::integer as qty,
            (line_item ->> 'interval')::varchar as intv,
            (line_item ->> 'interval_count')::integer as intv_count
        from
            jsonb_array_elements(line_items) as line_item
    ),
    line_item_ids as (
        select line_item_id from item_data
    ),
    deleted_items as (
        delete from
            public.subscription_items
        where
            public.subscription_items.subscription_id = new_subscription.id
            and public.subscription_items.id not in (select line_item_id from line_item_ids)
        returning *
    )
    insert into public.subscription_items(
        id,
        subscription_id,
        product_id,
        variant_id,
        type,
        price_amount,
        quantity,
        interval,
        interval_count)
    select
        line_item_id,
        target_subscription_id,
        prod_id,
        var_id,
        type,
        price_amt,
        qty,
        intv,
        intv_count
    from
        item_data
    on conflict (id)
        do update set
            product_id = excluded.product_id,
            variant_id = excluded.variant_id,
            price_amount = excluded.price_amount,
            quantity = excluded.quantity,
            interval = excluded.interval,
            type = excluded.type,
            interval_count = excluded.interval_count;

    return new_subscription;

end;

$function$
;

create or replace view "public"."user_account_workspace" as  SELECT id,
    name,
    picture_url,
    NULL::public.subscription_status AS subscription_status
   FROM public.accounts
  WHERE (user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1;


create or replace view "public"."user_accounts" as  SELECT org.id,
    org.name,
    org.picture_url,
    org.slug,
    membership.account_role AS role
   FROM (public.organizations org
     JOIN public.organization_memberships membership ON ((org.id = membership.organization_id)))
  WHERE (membership.user_id = ( SELECT auth.uid() AS uid));


CREATE OR REPLACE FUNCTION public.verify_nonce(p_token text, p_purpose text, p_user_id uuid DEFAULT NULL::uuid, p_required_scopes text[] DEFAULT NULL::text[], p_max_verification_attempts integer DEFAULT 5, p_ip inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_nonce          RECORD;
BEGIN
    -- Find and update the nonce in a single operation
    -- First filter by indexed columns to reduce candidate rows, then do bcrypt comparison
    WITH candidate_nonces AS (
        -- Use index to filter candidates by purpose, user_id, expiry, status
        SELECT id, client_token, user_id, purpose, metadata, scopes,
               verification_attempts, expires_at, used_at, revoked
        FROM public.nonces
        WHERE purpose = p_purpose
          AND used_at IS NULL
          AND NOT revoked
          AND expires_at > NOW()
          -- Only apply user_id filter if the token was created for a specific user
          AND (
            -- Case 1: Anonymous token (user_id is NULL in DB)
            (user_id IS NULL)
                OR
                -- Case 2: User-specific token (check if user_id matches)
            (user_id = p_user_id)
          )
        ORDER BY created_at DESC
        -- Safety net: Limit to 100 most recent candidates to cap worst-case performance
        -- In production, auto-revocation keeps this low, but this protects against edge cases
        LIMIT 100
        -- CRITICAL: Lock rows to prevent race conditions in concurrent verifications
        -- SKIP LOCKED ensures other requests fail fast instead of waiting
        FOR UPDATE SKIP LOCKED
    ),
    matched_nonce AS (
        -- Now do the expensive bcrypt comparison only on filtered candidates
        SELECT *
        FROM candidate_nonces
        WHERE client_token = extensions.crypt(p_token, client_token)
        LIMIT 1
    ),
    updated_nonce AS (
        -- Update only the matched nonce
        UPDATE public.nonces
        SET verification_attempts        = verification_attempts + 1,
            last_verification_at         = NOW(),
            last_verification_ip         = COALESCE(p_ip, last_verification_ip),
            last_verification_user_agent = COALESCE(p_user_agent, last_verification_user_agent)
        WHERE id = (SELECT id FROM matched_nonce)
        RETURNING *
    )
    SELECT * INTO v_nonce FROM updated_nonce;

    -- Check if nonce exists
    IF v_nonce.id IS NULL THEN
        RETURN jsonb_build_object(
                'valid', false,
                'message', 'Invalid or expired token'
               );
    END IF;

    -- Check if max verification attempts exceeded (using the incremented value)
    IF p_max_verification_attempts > 0 AND v_nonce.verification_attempts > p_max_verification_attempts THEN
        -- Automatically revoke the token
        UPDATE public.nonces
        SET revoked        = TRUE,
            revoked_reason = 'Maximum verification attempts exceeded'
        WHERE id = v_nonce.id;

        RETURN jsonb_build_object(
                'valid', false,
                'message', 'Token revoked due to too many verification attempts',
                'max_attempts_exceeded', true
               );
    END IF;

    -- Check scopes if required
    IF p_required_scopes IS NOT NULL AND array_length(p_required_scopes, 1) > 0 THEN
        -- Fix scope validation to properly check if token scopes contain all required scopes
        -- Using array containment check: array1 @> array2 (array1 contains array2)
        IF NOT (v_nonce.scopes @> p_required_scopes) THEN
            RETURN jsonb_build_object(
                    'valid', false,
                    'message', 'Token does not have required permissions',
                    'token_scopes', v_nonce.scopes,
                    'required_scopes', p_required_scopes
                   );
        END IF;
    END IF;

    -- Mark nonce as used
    UPDATE public.nonces
    SET used_at = NOW()
    WHERE id = v_nonce.id;

    -- Return success with metadata
    RETURN jsonb_build_object(
            'valid', true,
            'user_id', v_nonce.user_id,
            'metadata', v_nonce.metadata,
            'scopes', v_nonce.scopes,
            'purpose', v_nonce.purpose
           );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_current_user_to_new_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    if new.user_id = auth.uid() then
        insert into public.organization_memberships(
            organization_id,
            user_id,
            account_role)
        values(
            new.id,
            auth.uid(),
            public.get_upper_system_role());

    end if;

    return NEW;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_nonces(p_older_than_days integer DEFAULT 1, p_include_used boolean DEFAULT true, p_include_revoked boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count and delete expired or used nonces based on parameters
  WITH deleted AS (
    DELETE FROM public.nonces
    WHERE
      (
        -- Expired and unused tokens
        (expires_at < NOW() AND used_at IS NULL)

        -- Used tokens older than specified days (if enabled)
        OR (p_include_used = TRUE AND used_at < NOW() - (p_older_than_days * interval '1 day'))

        -- Revoked tokens older than specified days (if enabled)
        OR (p_include_revoked = TRUE AND revoked = TRUE AND created_at < NOW() - (p_older_than_days * interval '1 day'))
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_usage_timestamp_id()
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  epoch_seconds numeric;
  milliseconds bigint;
  microseconds_total integer;
  fractional_ms integer;
  collision_counter integer;
  timestamp_id bigint;
begin
  -- Get current timestamp with high precision
  epoch_seconds := extract(epoch from clock_timestamp());
  
  -- Calculate integer milliseconds since epoch
  milliseconds := floor(epoch_seconds * 1000)::bigint;
  
  -- Get total microseconds in current second (0-999999)
  microseconds_total := extract(microseconds from clock_timestamp())::integer;
  
  -- Extract fractional milliseconds (0-999) from microseconds
  -- This gives us sub-millisecond precision
  fractional_ms := microseconds_total % 1000;
  
  -- Get next value from collision counter sequence (0-999)
  -- This ensures uniqueness even if multiple inserts happen at the exact same microsecond
  collision_counter := nextval('public.usage_id_collision_seq');
  
  -- Combine: milliseconds * 1,000,000 + fractional_ms * 1000 + collision_counter
  -- Format: [milliseconds][fractional_ms * 1000][collision_counter (0-999)]
  -- This provides microsecond-level precision with collision handling
  -- Example: 1704067200123456000 (milliseconds=1704067200123, fractional_ms=456, counter=0)
  timestamp_id := milliseconds * 1000000 + fractional_ms * 1000 + collision_counter;
  
  return timestamp_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_storage_filename_as_uuid(name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    return replace(storage.filename(name), concat('.',
	storage.extension(name)), '')::uuid;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.handle_update_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    update
        public.accounts
    set
        email = new.email
    where
        user_id = new.id;

    return new;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.prevent_memberships_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.account_role <> old.account_role then return new;
end if;
raise exception 'Only the account_role can be updated';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_organization_owner_membership_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if exists(
    select 1
    from public.organizations
    where id = old.organization_id
      and user_id = old.user_id
  ) then raise exception 'The primary organization owner cannot be removed from the organization membership list';
end if;
return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_account_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    if current_user in('authenticated', 'anon') then
	if new.id <> old.id or new.user_id <>
	    old.user_id or new.email <> old.email then
            raise exception 'You do not have permission to update this field';

        end if;

    end if;

    return NEW;

end
$function$
;

CREATE OR REPLACE FUNCTION public.set_slug_from_account_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    sql_string varchar;
    tmp_slug varchar;
    increment integer;
    tmp_row record;
    tmp_row_count integer;
begin
    tmp_row_count = 1;

    increment = 0;

    while tmp_row_count > 0 loop
        if increment > 0 then
            tmp_slug = public.slugify(new.name || ' ' || increment::varchar);

        else
            tmp_slug = public.slugify(new.name);

        end if;

	sql_string = format('select count(1) cnt from public.accounts where slug = ''' || tmp_slug ||
	    '''; ');

        for tmp_row in execute (sql_string)
            loop
                raise notice 'tmp_row %', tmp_row;

                tmp_row_count = tmp_row.cnt;

            end loop;

        increment = increment +1;

    end loop;

    new.slug := tmp_slug;

    return NEW;

end
$function$
;

CREATE OR REPLACE FUNCTION public.setup_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    user_name text;
    picture_url text;
begin
    if new.raw_user_meta_data ->> 'name' is not null then
        user_name := new.raw_user_meta_data ->> 'name';

    end if;

    if user_name is null and new.email is not null then
        user_name := split_part(new.email, '@', 1);

    end if;

    if user_name is null then
        user_name := '';

    end if;

    if new.raw_user_meta_data ->> 'avatar_url' is not null then
        picture_url := new.raw_user_meta_data ->> 'avatar_url';
    else
        picture_url := null;
    end if;

    insert into public.accounts(
        id,
        user_id,
        name,
        picture_url,
        email)
    values (
        new.id,
        new.id,
        user_name,
        picture_url,
        new.email);

    return new;

end;

$function$
;

CREATE OR REPLACE FUNCTION public.slugify(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
    -- removes accents (diacritic signs) from a given string --
    with "unaccented" as(
        select
            public.unaccent("value") as "value"
),
-- lowercases the string
"lowercase" as(
    select
        lower("value") as "value"
    from
        "unaccented"
),
-- remove single and double quotes
"removed_quotes" as(
    select
	regexp_replace("value", '[''"]+', '',
	    'gi') as "value"
    from
        "lowercase"
),
-- replaces anything that's not a letter, number, hyphen('-'), or underscore('_') with a hyphen('-')
"hyphenated" as(
    select
	regexp_replace("value", '[^a-z0-9\\-_]+', '-',
	    'gi') as "value"
    from
        "removed_quotes"
),
-- trims hyphens('-') if they exist on the head or tail of
--   the string
"trimmed" as(
    select
	regexp_replace(regexp_replace("value", '\-+$',
	    ''), '^\-', '') as "value" from "hyphenated"
)
        select
            "value"
        from
            "trimmed";
$function$
;

CREATE OR REPLACE FUNCTION public.update_notification_dismissed_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    old.dismissed := new.dismissed;

    if (new is distinct from old) then
         raise exception 'UPDATE of columns other than "dismissed" is forbidden';
    end if;

    return old;
end;
$function$
;

grant delete on table "public"."accounts" to "anon";

grant insert on table "public"."accounts" to "anon";

grant references on table "public"."accounts" to "anon";

grant select on table "public"."accounts" to "anon";

grant trigger on table "public"."accounts" to "anon";

grant truncate on table "public"."accounts" to "anon";

grant update on table "public"."accounts" to "anon";

grant delete on table "public"."accounts" to "authenticated";

grant insert on table "public"."accounts" to "authenticated";

grant select on table "public"."accounts" to "authenticated";

grant update on table "public"."accounts" to "authenticated";

grant delete on table "public"."accounts" to "service_role";

grant insert on table "public"."accounts" to "service_role";

grant select on table "public"."accounts" to "service_role";

grant update on table "public"."accounts" to "service_role";

grant delete on table "public"."config" to "anon";

grant insert on table "public"."config" to "anon";

grant references on table "public"."config" to "anon";

grant select on table "public"."config" to "anon";

grant trigger on table "public"."config" to "anon";

grant truncate on table "public"."config" to "anon";

grant update on table "public"."config" to "anon";

grant select on table "public"."config" to "authenticated";

grant select on table "public"."config" to "service_role";

grant delete on table "public"."conversation_shares" to "anon";

grant insert on table "public"."conversation_shares" to "anon";

grant references on table "public"."conversation_shares" to "anon";

grant select on table "public"."conversation_shares" to "anon";

grant trigger on table "public"."conversation_shares" to "anon";

grant truncate on table "public"."conversation_shares" to "anon";

grant update on table "public"."conversation_shares" to "anon";

grant delete on table "public"."conversation_shares" to "authenticated";

grant insert on table "public"."conversation_shares" to "authenticated";

grant select on table "public"."conversation_shares" to "authenticated";

grant delete on table "public"."conversations" to "anon";

grant insert on table "public"."conversations" to "anon";

grant references on table "public"."conversations" to "anon";

grant select on table "public"."conversations" to "anon";

grant trigger on table "public"."conversations" to "anon";

grant truncate on table "public"."conversations" to "anon";

grant update on table "public"."conversations" to "anon";

grant delete on table "public"."conversations" to "authenticated";

grant insert on table "public"."conversations" to "authenticated";

grant select on table "public"."conversations" to "authenticated";

grant update on table "public"."conversations" to "authenticated";

grant delete on table "public"."credits_transactions" to "anon";

grant insert on table "public"."credits_transactions" to "anon";

grant references on table "public"."credits_transactions" to "anon";

grant select on table "public"."credits_transactions" to "anon";

grant trigger on table "public"."credits_transactions" to "anon";

grant truncate on table "public"."credits_transactions" to "anon";

grant update on table "public"."credits_transactions" to "anon";

grant delete on table "public"."credits_transactions" to "authenticated";

grant insert on table "public"."credits_transactions" to "authenticated";

grant references on table "public"."credits_transactions" to "authenticated";

grant select on table "public"."credits_transactions" to "authenticated";

grant trigger on table "public"."credits_transactions" to "authenticated";

grant truncate on table "public"."credits_transactions" to "authenticated";

grant update on table "public"."credits_transactions" to "authenticated";

grant delete on table "public"."credits_transactions" to "service_role";

grant insert on table "public"."credits_transactions" to "service_role";

grant references on table "public"."credits_transactions" to "service_role";

grant select on table "public"."credits_transactions" to "service_role";

grant trigger on table "public"."credits_transactions" to "service_role";

grant truncate on table "public"."credits_transactions" to "service_role";

grant update on table "public"."credits_transactions" to "service_role";

grant delete on table "public"."datasources" to "anon";

grant insert on table "public"."datasources" to "anon";

grant references on table "public"."datasources" to "anon";

grant select on table "public"."datasources" to "anon";

grant trigger on table "public"."datasources" to "anon";

grant truncate on table "public"."datasources" to "anon";

grant update on table "public"."datasources" to "anon";

grant delete on table "public"."datasources" to "authenticated";

grant insert on table "public"."datasources" to "authenticated";

grant select on table "public"."datasources" to "authenticated";

grant update on table "public"."datasources" to "authenticated";

grant delete on table "public"."invitations" to "anon";

grant insert on table "public"."invitations" to "anon";

grant references on table "public"."invitations" to "anon";

grant select on table "public"."invitations" to "anon";

grant trigger on table "public"."invitations" to "anon";

grant truncate on table "public"."invitations" to "anon";

grant update on table "public"."invitations" to "anon";

grant delete on table "public"."invitations" to "authenticated";

grant insert on table "public"."invitations" to "authenticated";

grant select on table "public"."invitations" to "authenticated";

grant update on table "public"."invitations" to "authenticated";

grant delete on table "public"."invitations" to "service_role";

grant insert on table "public"."invitations" to "service_role";

grant select on table "public"."invitations" to "service_role";

grant update on table "public"."invitations" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."nonces" to "anon";

grant insert on table "public"."nonces" to "anon";

grant references on table "public"."nonces" to "anon";

grant select on table "public"."nonces" to "anon";

grant trigger on table "public"."nonces" to "anon";

grant truncate on table "public"."nonces" to "anon";

grant update on table "public"."nonces" to "anon";

grant delete on table "public"."nonces" to "authenticated";

grant insert on table "public"."nonces" to "authenticated";

grant references on table "public"."nonces" to "authenticated";

grant select on table "public"."nonces" to "authenticated";

grant trigger on table "public"."nonces" to "authenticated";

grant truncate on table "public"."nonces" to "authenticated";

grant update on table "public"."nonces" to "authenticated";

grant delete on table "public"."nonces" to "service_role";

grant insert on table "public"."nonces" to "service_role";

grant references on table "public"."nonces" to "service_role";

grant select on table "public"."nonces" to "service_role";

grant trigger on table "public"."nonces" to "service_role";

grant truncate on table "public"."nonces" to "service_role";

grant update on table "public"."nonces" to "service_role";

grant delete on table "public"."notebook_shares" to "anon";

grant insert on table "public"."notebook_shares" to "anon";

grant references on table "public"."notebook_shares" to "anon";

grant select on table "public"."notebook_shares" to "anon";

grant trigger on table "public"."notebook_shares" to "anon";

grant truncate on table "public"."notebook_shares" to "anon";

grant update on table "public"."notebook_shares" to "anon";

grant delete on table "public"."notebook_shares" to "authenticated";

grant insert on table "public"."notebook_shares" to "authenticated";

grant select on table "public"."notebook_shares" to "authenticated";

grant delete on table "public"."notebook_versions" to "anon";

grant insert on table "public"."notebook_versions" to "anon";

grant references on table "public"."notebook_versions" to "anon";

grant select on table "public"."notebook_versions" to "anon";

grant trigger on table "public"."notebook_versions" to "anon";

grant truncate on table "public"."notebook_versions" to "anon";

grant update on table "public"."notebook_versions" to "anon";

grant insert on table "public"."notebook_versions" to "authenticated";

grant select on table "public"."notebook_versions" to "authenticated";

grant delete on table "public"."notebooks" to "anon";

grant insert on table "public"."notebooks" to "anon";

grant references on table "public"."notebooks" to "anon";

grant select on table "public"."notebooks" to "anon";

grant trigger on table "public"."notebooks" to "anon";

grant truncate on table "public"."notebooks" to "anon";

grant update on table "public"."notebooks" to "anon";

grant delete on table "public"."notebooks" to "authenticated";

grant insert on table "public"."notebooks" to "authenticated";

grant select on table "public"."notebooks" to "authenticated";

grant update on table "public"."notebooks" to "authenticated";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant select on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."organization_memberships" to "anon";

grant insert on table "public"."organization_memberships" to "anon";

grant references on table "public"."organization_memberships" to "anon";

grant select on table "public"."organization_memberships" to "anon";

grant trigger on table "public"."organization_memberships" to "anon";

grant truncate on table "public"."organization_memberships" to "anon";

grant update on table "public"."organization_memberships" to "anon";

grant delete on table "public"."organization_memberships" to "authenticated";

grant insert on table "public"."organization_memberships" to "authenticated";

grant select on table "public"."organization_memberships" to "authenticated";

grant update on table "public"."organization_memberships" to "authenticated";

grant delete on table "public"."organization_memberships" to "service_role";

grant insert on table "public"."organization_memberships" to "service_role";

grant select on table "public"."organization_memberships" to "service_role";

grant update on table "public"."organization_memberships" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."project_quotas" to "anon";

grant insert on table "public"."project_quotas" to "anon";

grant references on table "public"."project_quotas" to "anon";

grant select on table "public"."project_quotas" to "anon";

grant trigger on table "public"."project_quotas" to "anon";

grant truncate on table "public"."project_quotas" to "anon";

grant update on table "public"."project_quotas" to "anon";

grant delete on table "public"."project_quotas" to "authenticated";

grant insert on table "public"."project_quotas" to "authenticated";

grant references on table "public"."project_quotas" to "authenticated";

grant select on table "public"."project_quotas" to "authenticated";

grant trigger on table "public"."project_quotas" to "authenticated";

grant truncate on table "public"."project_quotas" to "authenticated";

grant update on table "public"."project_quotas" to "authenticated";

grant delete on table "public"."project_quotas" to "service_role";

grant insert on table "public"."project_quotas" to "service_role";

grant references on table "public"."project_quotas" to "service_role";

grant select on table "public"."project_quotas" to "service_role";

grant trigger on table "public"."project_quotas" to "service_role";

grant truncate on table "public"."project_quotas" to "service_role";

grant update on table "public"."project_quotas" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."role_permissions" to "anon";

grant insert on table "public"."role_permissions" to "anon";

grant references on table "public"."role_permissions" to "anon";

grant select on table "public"."role_permissions" to "anon";

grant trigger on table "public"."role_permissions" to "anon";

grant truncate on table "public"."role_permissions" to "anon";

grant update on table "public"."role_permissions" to "anon";

grant select on table "public"."role_permissions" to "authenticated";

grant delete on table "public"."role_permissions" to "service_role";

grant insert on table "public"."role_permissions" to "service_role";

grant select on table "public"."role_permissions" to "service_role";

grant update on table "public"."role_permissions" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant select on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "service_role";

grant delete on table "public"."subscription_items" to "anon";

grant insert on table "public"."subscription_items" to "anon";

grant references on table "public"."subscription_items" to "anon";

grant select on table "public"."subscription_items" to "anon";

grant trigger on table "public"."subscription_items" to "anon";

grant truncate on table "public"."subscription_items" to "anon";

grant update on table "public"."subscription_items" to "anon";

grant select on table "public"."subscription_items" to "authenticated";

grant delete on table "public"."subscription_items" to "service_role";

grant insert on table "public"."subscription_items" to "service_role";

grant select on table "public"."subscription_items" to "service_role";

grant update on table "public"."subscription_items" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."usage" to "anon";

grant insert on table "public"."usage" to "anon";

grant references on table "public"."usage" to "anon";

grant select on table "public"."usage" to "anon";

grant trigger on table "public"."usage" to "anon";

grant truncate on table "public"."usage" to "anon";

grant update on table "public"."usage" to "anon";

grant insert on table "public"."usage" to "authenticated";

grant select on table "public"."usage" to "authenticated";

grant insert on table "public"."usage" to "service_role";

grant select on table "public"."usage" to "service_role";

grant delete on table "public"."user_quotas" to "anon";

grant insert on table "public"."user_quotas" to "anon";

grant references on table "public"."user_quotas" to "anon";

grant select on table "public"."user_quotas" to "anon";

grant trigger on table "public"."user_quotas" to "anon";

grant truncate on table "public"."user_quotas" to "anon";

grant update on table "public"."user_quotas" to "anon";

grant delete on table "public"."user_quotas" to "authenticated";

grant insert on table "public"."user_quotas" to "authenticated";

grant references on table "public"."user_quotas" to "authenticated";

grant select on table "public"."user_quotas" to "authenticated";

grant trigger on table "public"."user_quotas" to "authenticated";

grant truncate on table "public"."user_quotas" to "authenticated";

grant update on table "public"."user_quotas" to "authenticated";

grant delete on table "public"."user_quotas" to "service_role";

grant insert on table "public"."user_quotas" to "service_role";

grant references on table "public"."user_quotas" to "service_role";

grant select on table "public"."user_quotas" to "service_role";

grant trigger on table "public"."user_quotas" to "service_role";

grant truncate on table "public"."user_quotas" to "service_role";

grant update on table "public"."user_quotas" to "service_role";

grant delete on table "public"."volume_pricing_tiers" to "anon";

grant insert on table "public"."volume_pricing_tiers" to "anon";

grant references on table "public"."volume_pricing_tiers" to "anon";

grant select on table "public"."volume_pricing_tiers" to "anon";

grant trigger on table "public"."volume_pricing_tiers" to "anon";

grant truncate on table "public"."volume_pricing_tiers" to "anon";

grant update on table "public"."volume_pricing_tiers" to "anon";

grant select on table "public"."volume_pricing_tiers" to "authenticated";

grant select on table "public"."volume_pricing_tiers" to "service_role";


  create policy "accounts_read"
  on "public"."accounts"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR public.share_organization_with_user(user_id)));



  create policy "accounts_self_update"
  on "public"."accounts"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "restrict_mfa_accounts"
  on "public"."accounts"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "super_admins_access_accounts"
  on "public"."accounts"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "public config can be read by authenticated users"
  on "public"."config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "conversation_shares_delete"
  on "public"."conversation_shares"
  as permissive
  for delete
  to authenticated
using (public.is_conversation_owner(conversation_id));



  create policy "conversation_shares_read"
  on "public"."conversation_shares"
  as permissive
  for select
  to authenticated
using ((public.is_conversation_owner(conversation_id) OR (user_id = auth.uid()) OR (organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE ((organizations.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.organization_memberships
          WHERE ((organization_memberships.organization_id = conversation_shares.organization_id) AND (organization_memberships.user_id = auth.uid())))))))));



  create policy "conversation_shares_write"
  on "public"."conversation_shares"
  as permissive
  for insert
  to authenticated
with check ((public.is_conversation_owner(conversation_id) AND public.has_permission(auth.uid(), ( SELECT p.organization_id
   FROM (public.projects p
     JOIN public.conversations c ON ((c.project_id = p.id)))
  WHERE (c.id = conversation_shares.conversation_id)), 'conversations.share'::public.app_permissions)));



  create policy "conversations_delete"
  on "public"."conversations"
  as permissive
  for delete
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = conversations.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::public.app_permissions)))))));



  create policy "conversations_read"
  on "public"."conversations"
  as permissive
  for select
  to authenticated
using (((created_by = auth.uid()) OR (is_public = true) OR (EXISTS ( SELECT 1
   FROM public.conversation_shares cs
  WHERE ((cs.conversation_id = conversations.id) AND ((cs.user_id = auth.uid()) OR (cs.organization_id IN ( SELECT organization_memberships.organization_id
           FROM public.organization_memberships
          WHERE (organization_memberships.user_id = auth.uid())))))))));



  create policy "conversations_read_public"
  on "public"."conversations"
  as permissive
  for select
  to anon
using ((is_public = true));



  create policy "conversations_update"
  on "public"."conversations"
  as permissive
  for update
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = conversations.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::public.app_permissions)))))))
with check (((created_by = auth.uid()) AND (is_public = false)));



  create policy "conversations_write"
  on "public"."conversations"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = conversations.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'conversations.manage'::public.app_permissions))))) OR (remixed_from IS NOT NULL))));



  create policy "credits_transactions_read"
  on "public"."credits_transactions"
  as permissive
  for select
  to authenticated
using (public.has_role_on_organization(organization_id));



  create policy "datasources_delete"
  on "public"."datasources"
  as permissive
  for delete
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (((is_private = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))) OR ((is_private = true) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))))));



  create policy "datasources_read"
  on "public"."datasources"
  as permissive
  for select
  to authenticated
using ((((is_private = false) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND public.has_role_on_organization(p.organization_id))))) OR ((is_private = true) AND (created_by = auth.uid())) OR (is_public = true)));



  create policy "datasources_read_public"
  on "public"."datasources"
  as permissive
  for select
  to anon
using ((is_public = true));



  create policy "datasources_update"
  on "public"."datasources"
  as permissive
  for update
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (((is_private = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))) OR ((is_private = true) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))))))
with check (((created_by = auth.uid()) AND (is_public = false)));



  create policy "datasources_write"
  on "public"."datasources"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND (((is_private = false) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))) OR ((is_private = true) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.manage'::public.app_permissions)))))) OR ((is_public = true) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = datasources.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'datasources.publish'::public.app_permissions)))))) OR (remixed_from IS NOT NULL))));



  create policy "invitations_create_self"
  on "public"."invitations"
  as permissive
  for insert
  to authenticated
with check ((public.has_permission(( SELECT auth.uid() AS uid), organization_id, 'invites.manage'::public.app_permissions) AND (public.has_more_elevated_role(( SELECT auth.uid() AS uid), organization_id, role) OR public.has_same_role_hierarchy_level(( SELECT auth.uid() AS uid), organization_id, role))));



  create policy "invitations_delete"
  on "public"."invitations"
  as permissive
  for delete
  to authenticated
using ((public.has_role_on_organization(organization_id) AND public.has_permission(( SELECT auth.uid() AS uid), organization_id, 'invites.manage'::public.app_permissions)));



  create policy "invitations_read_self"
  on "public"."invitations"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_organization(organization_id) OR ((email)::text = (auth.jwt() ->> 'email'::text))));



  create policy "invitations_update"
  on "public"."invitations"
  as permissive
  for update
  to authenticated
using ((public.has_permission(( SELECT auth.uid() AS uid), organization_id, 'invites.manage'::public.app_permissions) AND public.has_more_elevated_role(( SELECT auth.uid() AS uid), organization_id, role)))
with check ((public.has_permission(( SELECT auth.uid() AS uid), organization_id, 'invites.manage'::public.app_permissions) AND public.has_more_elevated_role(( SELECT auth.uid() AS uid), organization_id, role)));



  create policy "restrict_mfa_invitations"
  on "public"."invitations"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "super_admins_access_invitations"
  on "public"."invitations"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "messages_delete"
  on "public"."messages"
  as permissive
  for delete
  to authenticated
using (((role = 'user'::text) AND (EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.projects p ON ((p.id = c.project_id)))
  WHERE ((c.id = messages.conversation_id) AND (c.created_by = auth.uid()) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::public.app_permissions)))))));



  create policy "messages_read"
  on "public"."messages"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.created_by = auth.uid()) OR (c.is_public = true) OR (EXISTS ( SELECT 1
           FROM public.conversation_shares cs
          WHERE ((cs.conversation_id = c.id) AND ((cs.user_id = auth.uid()) OR (cs.organization_id IN ( SELECT organization_memberships.organization_id
                   FROM public.organization_memberships
                  WHERE (organization_memberships.user_id = auth.uid()))))))))))));



  create policy "messages_read_public"
  on "public"."messages"
  as permissive
  for select
  to anon
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND (c.is_public = true)))));



  create policy "messages_update"
  on "public"."messages"
  as permissive
  for update
  to authenticated
using (((role = 'user'::text) AND (EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.projects p ON ((p.id = c.project_id)))
  WHERE ((c.id = messages.conversation_id) AND (c.created_by = auth.uid()) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::public.app_permissions)))))))
with check (((role = 'user'::text) AND (EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.projects p ON ((p.id = c.project_id)))
  WHERE ((c.id = messages.conversation_id) AND (c.created_by = auth.uid()) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::public.app_permissions)))))));



  create policy "messages_write"
  on "public"."messages"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.projects p ON ((p.id = c.project_id)))
  WHERE ((c.id = messages.conversation_id) AND (c.created_by = auth.uid()) AND (c.is_public = false) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'messages.manage'::public.app_permissions)))))));



  create policy "Users can read their own nonces"
  on "public"."nonces"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "notebook_shares_delete"
  on "public"."notebook_shares"
  as permissive
  for delete
  to authenticated
using (public.is_notebook_owner(notebook_id));



  create policy "notebook_shares_read"
  on "public"."notebook_shares"
  as permissive
  for select
  to authenticated
using ((public.is_notebook_owner(notebook_id) OR (user_id = auth.uid()) OR (organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE ((organizations.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.organization_memberships
          WHERE ((organization_memberships.organization_id = notebook_shares.organization_id) AND (organization_memberships.user_id = auth.uid())))))))));



  create policy "notebook_shares_write"
  on "public"."notebook_shares"
  as permissive
  for insert
  to authenticated
with check ((public.is_notebook_owner(notebook_id) AND public.has_permission(auth.uid(), ( SELECT p.organization_id
   FROM (public.projects p
     JOIN public.notebooks n ON ((n.project_id = p.id)))
  WHERE (n.id = notebook_shares.notebook_id)), 'notebooks.share'::public.app_permissions)));



  create policy "notebook_versions_read"
  on "public"."notebook_versions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.notebooks n
  WHERE ((n.id = notebook_versions.notebook_id) AND ((n.created_by = auth.uid()) OR (n.is_public = true) OR (EXISTS ( SELECT 1
           FROM public.notebook_shares ns
          WHERE ((ns.notebook_id = n.id) AND ((ns.user_id = auth.uid()) OR (ns.organization_id IN ( SELECT organization_memberships.organization_id
                   FROM public.organization_memberships
                  WHERE (organization_memberships.user_id = auth.uid()))))))))))));



  create policy "notebook_versions_read_public"
  on "public"."notebook_versions"
  as permissive
  for select
  to anon
using ((EXISTS ( SELECT 1
   FROM public.notebooks n
  WHERE ((n.id = notebook_versions.notebook_id) AND (n.is_public = true)))));



  create policy "notebook_versions_write"
  on "public"."notebook_versions"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.notebooks n
     JOIN public.projects p ON ((p.id = n.project_id)))
  WHERE ((n.id = notebook_versions.notebook_id) AND (n.created_by = auth.uid()) AND (n.is_public = false) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::public.app_permissions))))));



  create policy "notebooks_delete"
  on "public"."notebooks"
  as permissive
  for delete
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = notebooks.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::public.app_permissions)))))));



  create policy "notebooks_read"
  on "public"."notebooks"
  as permissive
  for select
  to authenticated
using (((created_by = auth.uid()) OR (is_public = true) OR (EXISTS ( SELECT 1
   FROM public.notebook_shares ns
  WHERE ((ns.notebook_id = notebooks.id) AND ((ns.user_id = auth.uid()) OR (ns.organization_id IN ( SELECT organization_memberships.organization_id
           FROM public.organization_memberships
          WHERE (organization_memberships.user_id = auth.uid())))))))));



  create policy "notebooks_read_public"
  on "public"."notebooks"
  as permissive
  for select
  to anon
using ((is_public = true));



  create policy "notebooks_update"
  on "public"."notebooks"
  as permissive
  for update
  to authenticated
using (((created_by = auth.uid()) AND (is_public = false) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = notebooks.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::public.app_permissions)))))))
with check (((created_by = auth.uid()) AND (is_public = false)));



  create policy "notebooks_write"
  on "public"."notebooks"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = notebooks.project_id) AND (public.is_organization_owner(p.organization_id) OR public.has_permission(auth.uid(), p.organization_id, 'notebooks.manage'::public.app_permissions))))) OR (remixed_from IS NOT NULL))));



  create policy "notifications_read_self"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using (((account_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(account_id)));



  create policy "notifications_update_self"
  on "public"."notifications"
  as permissive
  for update
  to authenticated
using (((account_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(account_id)));



  create policy "restrict_mfa_notifications"
  on "public"."notifications"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "order_items_read_self"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND public.has_role_on_organization(orders.organization_id)))));



  create policy "restrict_mfa_order_items"
  on "public"."order_items"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "super_admins_access_order_items"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "orders_read_self"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_organization(organization_id)));



  create policy "restrict_mfa_orders"
  on "public"."orders"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "super_admins_access_orders"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "organization_memberships_delete"
  on "public"."organization_memberships"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.can_action_organization_member(organization_id, user_id)));



  create policy "organization_memberships_read"
  on "public"."organization_memberships"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR public.is_organization_member(organization_id, ( SELECT auth.uid() AS uid))));



  create policy "restrict_mfa_organization_memberships"
  on "public"."organization_memberships"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "super_admins_access_organization_memberships"
  on "public"."organization_memberships"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "organizations_delete"
  on "public"."organizations"
  as permissive
  for delete
  to authenticated
using ((public.is_organization_owner(id) OR public.has_permission(auth.uid(), id, 'projects.manage'::public.app_permissions)));



  create policy "organizations_read"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(id) OR public.has_valid_invitation_for_organization(id)));



  create policy "organizations_update"
  on "public"."organizations"
  as permissive
  for update
  to authenticated
using ((public.is_organization_owner(id) OR public.has_permission(auth.uid(), id, 'projects.manage'::public.app_permissions)))
with check ((public.is_organization_owner(id) OR public.has_permission(auth.uid(), id, 'projects.manage'::public.app_permissions)));



  create policy "organizations_write"
  on "public"."organizations"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "restrict_mfa_organizations"
  on "public"."organizations"
  as restrictive
  for all
  to authenticated
using ((public.is_mfa_compliant() OR public.has_valid_invitation_for_organization(id)));



  create policy "super_admins_access_organizations"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "project_quotas_read"
  on "public"."project_quotas"
  as permissive
  for select
  to authenticated
using (public.has_role_on_organization(organization_id));



  create policy "projects_delete"
  on "public"."projects"
  as permissive
  for delete
  to authenticated
using ((public.is_organization_owner(organization_id) OR public.has_permission(auth.uid(), organization_id, 'projects.manage'::public.app_permissions)));



  create policy "projects_read"
  on "public"."projects"
  as permissive
  for select
  to authenticated
using (public.has_role_on_organization(organization_id));



  create policy "projects_update"
  on "public"."projects"
  as permissive
  for update
  to authenticated
using ((public.is_organization_owner(organization_id) OR public.has_permission(auth.uid(), organization_id, 'projects.manage'::public.app_permissions)))
with check ((public.is_organization_owner(organization_id) OR public.has_permission(auth.uid(), organization_id, 'projects.manage'::public.app_permissions)));



  create policy "projects_write"
  on "public"."projects"
  as permissive
  for insert
  to authenticated
with check ((public.is_organization_owner(organization_id) OR public.has_permission(auth.uid(), organization_id, 'projects.manage'::public.app_permissions)));



  create policy "restrict_mfa_role_permissions"
  on "public"."role_permissions"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "role_permissions_read"
  on "public"."role_permissions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "super_admins_access_role_permissions"
  on "public"."role_permissions"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "roles_read"
  on "public"."roles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "restrict_mfa_subscription_items"
  on "public"."subscription_items"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "subscription_items_read_self"
  on "public"."subscription_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.id = subscription_items.subscription_id) AND public.has_role_on_organization(subscriptions.organization_id)))));



  create policy "super_admins_access_subscription_items"
  on "public"."subscription_items"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "restrict_mfa_subscriptions"
  on "public"."subscriptions"
  as restrictive
  for all
  to authenticated
using (public.is_mfa_compliant());



  create policy "subscriptions_read_self"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_organization(organization_id)));



  create policy "super_admins_access_subscriptions"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "usage_read"
  on "public"."usage"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(organization_id)));



  create policy "usage_write"
  on "public"."usage"
  as permissive
  for insert
  to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(organization_id)));



  create policy "usage_write_service"
  on "public"."usage"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "user_quotas_read"
  on "public"."user_quotas"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.has_role_on_organization(organization_id)));



  create policy "volume_pricing_tiers_read"
  on "public"."volume_pricing_tiers"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER protect_account_fields BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.protect_account_fields();

CREATE TRIGGER set_conversations_timestamps BEFORE INSERT OR UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_conversations_user_tracking BEFORE INSERT OR UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_datasources_timestamps BEFORE INSERT OR UPDATE ON public.datasources FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_datasources_user_tracking BEFORE INSERT OR UPDATE ON public.datasources FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_messages_timestamps BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_messages_user_tracking BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_notebooks_timestamps BEFORE INSERT OR UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_notebooks_user_tracking BEFORE INSERT OR UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER update_notification_dismissed_status BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notification_dismissed_status();

CREATE TRIGGER prevent_memberships_update_check BEFORE UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.prevent_memberships_update();

CREATE TRIGGER prevent_organization_owner_membership_delete_check BEFORE DELETE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.prevent_organization_owner_membership_delete();

CREATE TRIGGER add_current_user_to_new_organization AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.add_current_user_to_new_organization();

CREATE TRIGGER prevent_organizations_credit_updates BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.prevent_credit_updates();

CREATE TRIGGER set_organizations_timestamps BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_organizations_user_tracking BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_project_quotas_timestamps BEFORE INSERT OR UPDATE ON public.project_quotas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_projects_timestamps BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER set_projects_user_tracking BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER set_usage_timestamp_id BEFORE INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.trigger_set_usage_timestamp_id();

CREATE TRIGGER set_user_quotas_timestamps BEFORE INSERT OR UPDATE ON public.user_quotas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.setup_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_user_email();


  create policy "account_image"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'account_image'::text) AND ((public.get_storage_filename_as_uuid(name) = auth.uid()) OR public.has_role_on_organization(public.get_storage_filename_as_uuid(name)))))
with check (((bucket_id = 'account_image'::text) AND ((public.get_storage_filename_as_uuid(name) = auth.uid()) OR public.has_permission(auth.uid(), public.get_storage_filename_as_uuid(name), 'settings.manage'::public.app_permissions))));



