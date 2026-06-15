/*
 * -------------------------------------------------------
 * Section: Platform RLS
 *
 * Enables RLS on every platform table (36-41) and writes explicit
 * policies per operation. Four access patterns:
 *
 *   (1) Per-account private
 *       Tables: user_tokens
 *       Owner CRUDs own rows via is_account_owner(account_id).
 *
 *   (2) Per-account + public-default catalog
 *       Tables: performance_profile, image_provider
 *       SELECT: owner sees own rows OR account_id IS NULL (public).
 *       WRITE:  owner writes own rows only; account_id IS NULL is service_role only.
 *
 *   (3) Global catalog — read-all, service-role writes
 *       Tables: image_provider_catalog, deployment_settings_catalog
 *       SELECT open to authenticated. No INSERT/UPDATE/DELETE policies,
 *       grants revoked so writes fall through to service_role only.
 *
 *   (4) Per-deployment scoped
 *       Tables: deployment_request, data_snapshot, data_clone, branch,
 *               compute, db_role, deployment_settings
 *       All check is_account_owner(account_id) directly (deployment_request
 *       + its direct children) or through the parent deployment.
 *       db_role has no direct owner column; the source reversed the
 *       relationship so db_role rows are only reachable via
 *       deployment_request.db_user_id — we scope db_role to "the caller
 *       owns some deployment that references this db_role".
 *
 * The `node` table is special: public-pool rows (account_id IS NULL AND
 * node_type = 'public') are readable by any authenticated user; writes
 * service_role only. Per-account rows scope to is_account_owner(account_id).
 * -------------------------------------------------------
 */

-- =====================================================================
-- (1) Per-account private — user_tokens
-- =====================================================================

alter table public.user_tokens enable row level security;

revoke all on public.user_tokens from authenticated, service_role;
grant select, insert, update, delete on public.user_tokens to authenticated;

create policy "user_tokens_read" on public.user_tokens for select
  to authenticated using (public.is_account_owner(account_id));

create policy "user_tokens_insert" on public.user_tokens for insert
  to authenticated with check (public.is_account_owner(account_id));

create policy "user_tokens_update" on public.user_tokens for update
  to authenticated using (public.is_account_owner(account_id))
  with check (public.is_account_owner(account_id));

create policy "user_tokens_delete" on public.user_tokens for delete
  to authenticated using (public.is_account_owner(account_id));

-- =====================================================================
-- (2) Per-account + public-default catalog
-- =====================================================================

-- performance_profile ------------------------------------------------------

alter table public.performance_profile enable row level security;

revoke all on public.performance_profile from authenticated, service_role;
grant select, insert, update, delete on public.performance_profile to authenticated;

-- SELECT: own rows, or the public catalog (account_id IS NULL) when active.
create policy "performance_profile_read" on public.performance_profile for select
  to authenticated using (
    (account_id is null and is_active = true)
    or (account_id is not null and public.is_account_owner(account_id))
  );

-- INSERT / UPDATE / DELETE: only own rows. Public-catalog rows (account_id IS NULL)
-- are seeded and maintained by service_role.
create policy "performance_profile_insert" on public.performance_profile for insert
  to authenticated with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "performance_profile_update" on public.performance_profile for update
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  )
  with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "performance_profile_delete" on public.performance_profile for delete
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  );

-- image_provider -----------------------------------------------------------

alter table public.image_provider enable row level security;

revoke all on public.image_provider from authenticated, service_role;
grant select, insert, update, delete on public.image_provider to authenticated;

create policy "image_provider_read" on public.image_provider for select
  to authenticated using (
    account_id is null
    or (account_id is not null and public.is_account_owner(account_id))
  );

create policy "image_provider_insert" on public.image_provider for insert
  to authenticated with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "image_provider_update" on public.image_provider for update
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  )
  with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "image_provider_delete" on public.image_provider for delete
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  );

-- =====================================================================
-- (3) Global catalog — read-all, service-role-only writes
-- =====================================================================

-- image_provider_catalog ---------------------------------------------------

alter table public.image_provider_catalog enable row level security;

revoke all on public.image_provider_catalog from authenticated, service_role;
grant select on public.image_provider_catalog to authenticated;

create policy "image_provider_catalog_read" on public.image_provider_catalog for select
  to authenticated using (true);

-- No write policies for authenticated — INSERT/UPDATE/DELETE fall through
-- to service_role which has bypassrls.

-- deployment_settings_catalog ---------------------------------------------

alter table public.deployment_settings_catalog enable row level security;

revoke all on public.deployment_settings_catalog from authenticated, service_role;
grant select on public.deployment_settings_catalog to authenticated;

create policy "deployment_settings_catalog_read" on public.deployment_settings_catalog for select
  to authenticated using (true);

-- resources ---------------------------------------------------------------
-- Global (account_id IS NULL) + per-account. Global rows are read-only for
-- authenticated users; per-account rows are owner-CRUD.

alter table public.resources enable row level security;

revoke all on public.resources from authenticated, service_role;
grant select, insert, update, delete on public.resources to authenticated;

create policy "resources_read" on public.resources for select
  to authenticated using (
    account_id is null
    or (account_id is not null and public.is_account_owner(account_id))
  );

create policy "resources_insert" on public.resources for insert
  to authenticated with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "resources_update" on public.resources for update
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  )
  with check (
    account_id is not null and public.is_account_owner(account_id)
  );

create policy "resources_delete" on public.resources for delete
  to authenticated using (
    account_id is not null and public.is_account_owner(account_id)
  );

-- node --------------------------------------------------------------------
-- Public-pool nodes (account_id IS NULL AND node_type = 'public') are
-- readable by any authenticated user; private nodes scope to owner. All
-- writes service_role only — nodes are infrastructure.

alter table public.node enable row level security;

revoke all on public.node from authenticated, service_role;
grant select on public.node to authenticated;

create policy "node_read" on public.node for select
  to authenticated using (
    (account_id is null and node_type = 'public')
    or (account_id is not null and public.is_account_owner(account_id))
  );

-- =====================================================================
-- (4) Per-deployment scoped
-- =====================================================================

-- deployment_request -------------------------------------------------------

alter table public.deployment_request enable row level security;

revoke all on public.deployment_request from authenticated, service_role;
grant select, insert, update, delete on public.deployment_request to authenticated;

create policy "deployment_request_read" on public.deployment_request for select
  to authenticated using (public.is_account_owner(account_id));

create policy "deployment_request_insert" on public.deployment_request for insert
  to authenticated with check (public.is_account_owner(account_id));

create policy "deployment_request_update" on public.deployment_request for update
  to authenticated using (public.is_account_owner(account_id))
  with check (public.is_account_owner(account_id));

create policy "deployment_request_delete" on public.deployment_request for delete
  to authenticated using (public.is_account_owner(account_id));

-- data_snapshot -----------------------------------------------------------

alter table public.data_snapshot enable row level security;

revoke all on public.data_snapshot from authenticated, service_role;
grant select, insert, update, delete on public.data_snapshot to authenticated;

create policy "data_snapshot_read" on public.data_snapshot for select
  to authenticated using (public.is_account_owner(account_id));

-- INSERT: caller owns the account AND, if the row references a deployment,
-- the caller also owns that deployment. Prevents cross-account linking.
create policy "data_snapshot_insert" on public.data_snapshot for insert
  to authenticated with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = data_snapshot.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "data_snapshot_update" on public.data_snapshot for update
  to authenticated using (public.is_account_owner(account_id))
  with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = data_snapshot.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "data_snapshot_delete" on public.data_snapshot for delete
  to authenticated using (public.is_account_owner(account_id));

-- data_clone --------------------------------------------------------------

alter table public.data_clone enable row level security;

revoke all on public.data_clone from authenticated, service_role;
grant select, insert, update, delete on public.data_clone to authenticated;

create policy "data_clone_read" on public.data_clone for select
  to authenticated using (public.is_account_owner(account_id));

create policy "data_clone_insert" on public.data_clone for insert
  to authenticated with check (public.is_account_owner(account_id));

create policy "data_clone_update" on public.data_clone for update
  to authenticated using (public.is_account_owner(account_id))
  with check (public.is_account_owner(account_id));

create policy "data_clone_delete" on public.data_clone for delete
  to authenticated using (public.is_account_owner(account_id));

-- branch ------------------------------------------------------------------

alter table public.branch enable row level security;

revoke all on public.branch from authenticated, service_role;
grant select, insert, update, delete on public.branch to authenticated;

create policy "branch_read" on public.branch for select
  to authenticated using (public.is_account_owner(account_id));

create policy "branch_insert" on public.branch for insert
  to authenticated with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = branch.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "branch_update" on public.branch for update
  to authenticated using (public.is_account_owner(account_id))
  with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = branch.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "branch_delete" on public.branch for delete
  to authenticated using (public.is_account_owner(account_id));

-- compute -----------------------------------------------------------------

alter table public.compute enable row level security;

revoke all on public.compute from authenticated, service_role;
grant select, insert, update, delete on public.compute to authenticated;

create policy "compute_read" on public.compute for select
  to authenticated using (public.is_account_owner(account_id));

create policy "compute_insert" on public.compute for insert
  to authenticated with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = compute.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "compute_update" on public.compute for update
  to authenticated using (public.is_account_owner(account_id))
  with check (
    public.is_account_owner(account_id)
    and (
      deployment_id is null
      or exists (
        select 1 from public.deployment_request dr
        where dr.id = compute.deployment_id
          and public.is_account_owner(dr.account_id)
      )
    )
  );

create policy "compute_delete" on public.compute for delete
  to authenticated using (public.is_account_owner(account_id));

-- db_role -----------------------------------------------------------------
-- db_role has no direct account_id column (the source reversed the
-- relationship via deployment_request.db_user_id). A db_role is reachable
-- only if the caller owns at least one deployment that references it.

alter table public.db_role enable row level security;

revoke all on public.db_role from authenticated, service_role;
grant select, insert, update, delete on public.db_role to authenticated;

-- SELECT: visible when either (a) a deployment_request the caller owns
-- references this db_role, or (b) the caller created it. The (b) branch
-- matters for INSERT … RETURNING — Postgres re-reads the inserted row
-- through the SELECT policy, so without this a creator can't even use
-- RETURNING to get the id of a row they just wrote.
create policy "db_role_read" on public.db_role for select
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.db_user_id = db_role.id
        and public.is_account_owner(dr.account_id)
    )
    or created_by = auth.uid()
  );

-- INSERT is open to any authenticated caller. The real security is the
-- SELECT scope: a db_role row becomes visible only once a deployment_request
-- the caller owns references it via `db_user_id`. An orphan db_role — one
-- no deployment links — stays invisible to every user regardless of who
-- created it, so allowing the INSERT does not leak anything. (The
-- created_by = auth.uid() check we'd normally want is unreliable here
-- because `auth.uid()` evaluation order versus BEFORE triggers is
-- inconsistent under pgTAP's authenticate_as context.)
create policy "db_role_insert" on public.db_role for insert
  to authenticated with check (true);

create policy "db_role_update" on public.db_role for update
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.db_user_id = db_role.id
        and public.is_account_owner(dr.account_id)
    )
    or created_by = auth.uid()
  )
  with check (
    exists (
      select 1 from public.deployment_request dr
      where dr.db_user_id = db_role.id
        and public.is_account_owner(dr.account_id)
    )
    or created_by = auth.uid()
  );

create policy "db_role_delete" on public.db_role for delete
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.db_user_id = db_role.id
        and public.is_account_owner(dr.account_id)
    )
    or created_by = auth.uid()
  );

-- deployment_settings -----------------------------------------------------
-- Scoped to the parent deployment's owner.

alter table public.deployment_settings enable row level security;

revoke all on public.deployment_settings from authenticated, service_role;
grant select, insert, update, delete on public.deployment_settings to authenticated;

create policy "deployment_settings_read" on public.deployment_settings for select
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.id = deployment_settings.deployment_id
        and public.is_account_owner(dr.account_id)
    )
  );

create policy "deployment_settings_insert" on public.deployment_settings for insert
  to authenticated with check (
    exists (
      select 1 from public.deployment_request dr
      where dr.id = deployment_settings.deployment_id
        and public.is_account_owner(dr.account_id)
    )
  );

create policy "deployment_settings_update" on public.deployment_settings for update
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.id = deployment_settings.deployment_id
        and public.is_account_owner(dr.account_id)
    )
  )
  with check (
    exists (
      select 1 from public.deployment_request dr
      where dr.id = deployment_settings.deployment_id
        and public.is_account_owner(dr.account_id)
    )
  );

create policy "deployment_settings_delete" on public.deployment_settings for delete
  to authenticated using (
    exists (
      select 1 from public.deployment_request dr
      where dr.id = deployment_settings.deployment_id
        and public.is_account_owner(dr.account_id)
    )
  );
