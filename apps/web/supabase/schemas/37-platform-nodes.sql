/*
 * -------------------------------------------------------
 * Section: Compute nodes
 * A node is a physical/logical host in a pool (shared `public` pool or
 * per-account `private` pool). Deployments request compute on a node.
 * -------------------------------------------------------
 */

create table if not exists public.node (
  id uuid primary key default extensions.uuid_generate_v4(),
  label_name varchar(255) not null,
  account_id uuid references public.accounts(id) on delete cascade default null,
  node_type public.node_type not null,
  node_pool varchar(255) not null,
  datacenter varchar(255) not null,
  region varchar(255) not null,
  hosting_provider public.hosting_provider not null,
  node_status public.node_status not null default 'Down',
  metadata jsonb default '{}'::jsonb,
  memory int not null,
  cpu int not null,
  storage int not null,
  is_deleted boolean not null default false,
  is_default boolean not null default false,
  is_active boolean not null default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.node is 'Compute nodes (shared public pool or per-account private pool) that host deployments.';

-- Shared-pool nodes: no account_id; ensure uniqueness on id alone.
create unique index if not exists unique_shared_node
  on public.node (id)
  where account_id is null;

-- Per-account nodes: account_id + id unique together.
create unique index if not exists unique_account_node
  on public.node (account_id, id)
  where account_id is not null;

-- Audit triggers — timestamps + user tracking auto-populated.
create trigger set_node_timestamps
  before insert or update on public.node
  for each row execute function public.trigger_set_timestamps();

create trigger set_node_user_tracking
  before insert or update on public.node
  for each row execute function public.trigger_set_user_tracking();

-- Stage 1 keeps RLS disabled on nodes (source never enabled it).
-- Stage 2 (file 42) enables RLS with read-all for public-pool rows and
-- owner-only reads for per-account rows, writes locked to service_role.
