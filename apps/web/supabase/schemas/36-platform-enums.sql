/*
 * -------------------------------------------------------
 * Section: Platform enums
 * Types used by the compute / deployment / data-plane primitives ported
 * from the older guepard-console repo. Consumed by tables in the 37-41
 * range — defined first so those files can reference them directly.
 * -------------------------------------------------------
 */

-- Nodes: shared pool vs. per-account
create type public.node_type as enum ('private', 'public');

-- Nodes: operational state
create type public.node_status as enum ('Up', 'Down');

-- Nodes + image providers: which cloud / environment is hosting the node
create type public.hosting_provider as enum (
  'AWS',
  'Azure',
  'GCP',
  'DigitalOcean',
  'Linode',
  'Vultr',
  'Other',
  'On-premise'
);

-- Deployment / branch / compute lifecycle state
create type public.job_status as enum (
  'INIT',
  'PENDING',
  'IN_PROGRESS',
  'CREATED',
  'ERROR',
  'DELETED'
);

-- Compute instance runtime state
create type public.compute_status as enum (
  'INIT',
  'PENDING',
  'RUNNING',
  'STOPPED',
  'ERROR'
);
