-- Add the `integrations.manage` value to the public.app_permissions enum.
--
-- Must be in its own migration file (separate transaction) from any code
-- that references the new value, because Postgres forbids using a newly
-- added enum value in the same transaction that added it.
--
-- The follow-up migration 20260411174741_integration-connections.sql
-- creates the integration_connections table and its RLS policies that
-- reference 'integrations.manage'::public.app_permissions.

alter type public.app_permissions add value if not exists 'integrations.manage';
