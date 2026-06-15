/*
 * -------------------------------------------------------
 * Section: Image providers
 * A catalog of DB container images (global, seeded) and per-account
 * assignments of which catalog rows that account can use.
 * -------------------------------------------------------
 */

create table if not exists public.image_provider_catalog (
  id uuid primary key default extensions.uuid_generate_v4(),
  image_type varchar(255) not null default 'PUBLIC',
  database_provider varchar(255) not null,
  database_version varchar(50) not null,
  volume_path varchar(255) not null,
  log_path varchar(255) not null,
  image_source varchar(255) not null default 'dockerhub',
  image_registry varchar(255),
  registry_username varchar(255),
  registry_password varchar(255),
  image_name varchar(255) not null,
  min_cpu int not null default 100,
  min_memory int not null default 128,
  user_var_name varchar(255),
  password_var_name varchar(255),
  database_var_name varchar(255),
  default_port int not null,
  user_uid int not null,
  user_gid int not null,
  support_status varchar(255) not null default 'SUPPORTED',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.image_provider_catalog is 'Global catalog of DB container images with registry + resource metadata. Seeded; writes are service_role only.';

create table if not exists public.image_provider (
  id uuid primary key default extensions.uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade,
  image_provider_id uuid references public.image_provider_catalog(id) on delete cascade,
  is_active boolean default true,
  is_default boolean default false
);

comment on table public.image_provider is 'Per-account assignment of catalog image providers; rows with account_id = NULL are globally visible.';

create index if not exists image_provider_by_account_id
  on public.image_provider (account_id);

create index if not exists image_provider_by_catalog_id
  on public.image_provider (image_provider_id);

-- Audit triggers (catalog only — image_provider has no timestamp columns in the source).
create trigger set_image_provider_catalog_timestamps
  before insert or update on public.image_provider_catalog
  for each row execute function public.trigger_set_timestamps();

create trigger set_image_provider_catalog_user_tracking
  before insert or update on public.image_provider_catalog
  for each row execute function public.trigger_set_user_tracking();

-- Note: the source `assign_image_providers(account_id, variant_id)` helper
-- depends on a `plan_entitlements` table that does not exist here. Deferred
-- until entitlement machinery lands.
