/*
 * -------------------------------------------------------
 * Section: Integration Connections
 *
 * Project-scoped credentials that let Guepard talk to a user's cloud
 * account (AWS, GCP in phase 1). Unlocks dataplane node provisioning and
 * cloud-database ingestion in later phases. See docs/rfcs/0001-integrations.md.
 *
 * Secrets policy:
 * - Raw credentials NEVER land in `config`. They are passed to the server,
 *   protected via ISecretVault.protect(), and the returned opaque handle
 *   is stored in `secret_ref`.
 * - `config` only holds non-secret metadata (default region, account hint).
 * - The sanitised DTO exposed to the browser does not include `secret_ref`.
 * -------------------------------------------------------
 */

-- Integration connections table
create table if not exists public.integration_connections (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null check (provider in ('aws', 'gcp')),
  name varchar(60) not null check (char_length(name) between 1 and 60),
  slug text not null check (char_length(slug) between 1 and 80),
  config jsonb not null default '{}'::jsonb,
  -- Opaque handle returned by ISecretVault.protect(). Nullable so the row
  -- can exist in a future draft state, but phase 1 always populates it.
  secret_ref text,
  test_status text not null default 'untested'
    check (test_status in ('untested', 'success', 'failed')),
  test_identity text,
  test_error text,
  tested_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null
);

comment on table public.integration_connections is
  'Project-scoped cloud-account credentials. Raw secrets live in ISecretVault; config holds only non-secret metadata.';
comment on column public.integration_connections.project_id is
  'The project this integration belongs to';
comment on column public.integration_connections.provider is
  'The cloud provider (aws, gcp). More providers arrive in phase 5.';
comment on column public.integration_connections.config is
  'Non-secret metadata (defaultRegion, accountHint). Never contains credentials.';
comment on column public.integration_connections.secret_ref is
  'Opaque handle returned by ISecretVault.protect(). Never echoed back to the browser.';
comment on column public.integration_connections.test_status is
  'Outcome of the last connection test: untested | success | failed';
comment on column public.integration_connections.test_identity is
  'Caller identity from the last successful test (AWS ARN or GCP service-account email)';
comment on column public.integration_connections.test_error is
  'Provider-supplied error detail from the last failed test';

-- Slugs are unique within a project.
create unique index if not exists unique_integration_connections_slug_per_project
  on public.integration_connections (project_id, slug);

-- Hot path: list integrations for the current project.
create index if not exists ix_integration_connections_project
  on public.integration_connections (project_id);

-- Enable RLS
alter table "public"."integration_connections" enable row level security;

-- Revoke default permissions
revoke all on public.integration_connections from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.integration_connections to authenticated;

-- RLS policies
--
-- Read: any member of the project's organization. Integrations are not a
-- secret themselves (the secrets are in the vault); the table row only
-- reveals provider, region, and test status, which are fine to show to
-- everyone on the team.
create policy "integration_connections_read" on public.integration_connections for select
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and public.has_role_on_organization(p.organization_id)
    )
  );

-- Insert: integrations.manage permission, or org owner. created_by must
-- match the caller so a malicious client can't spoof authorship.
create policy "integration_connections_insert" on public.integration_connections for insert
  to authenticated with check (
    created_by = auth.uid() and exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(
            auth.uid(),
            p.organization_id,
            'integrations.manage'::app_permissions
          )
        )
    )
  );

-- Update: integrations.manage or org owner. Checked on both USING (the row
-- as it exists) and WITH CHECK (the row as it will be) so a client cannot
-- move an integration into a project where they lack permission.
create policy "integration_connections_update" on public.integration_connections for update
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(
            auth.uid(),
            p.organization_id,
            'integrations.manage'::app_permissions
          )
        )
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(
            auth.uid(),
            p.organization_id,
            'integrations.manage'::app_permissions
          )
        )
    )
  );

-- Delete: integrations.manage or org owner.
create policy "integration_connections_delete" on public.integration_connections for delete
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(
            auth.uid(),
            p.organization_id,
            'integrations.manage'::app_permissions
          )
        )
    )
  );

-- Trigger to set timestamps
create trigger set_integration_connections_timestamps
  before insert or update on public.integration_connections
  for each row execute function public.trigger_set_timestamps();

-- Trigger to set user tracking
create trigger set_integration_connections_user_tracking
  before insert or update on public.integration_connections
  for each row execute function public.trigger_set_user_tracking();
