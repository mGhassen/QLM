-- Seed the `account_image` storage bucket.
--
-- The declarative schema `apps/web/supabase/schemas/19-storage.sql`
-- creates this bucket with `INSERT INTO storage.buckets ...`, but a
-- previous `supabase db diff` run only carried the RLS policy and the
-- `get_storage_filename_as_uuid` helper into the initial migration —
-- the bucket row itself was lost. Without it, every `supabase db
-- reset` produces a working policy attached to a bucket that doesn't
-- exist, and avatar uploads fail with `Bucket not found`.
--
-- Idempotent so re-runs against a DB where the bucket already exists
-- (e.g. one that was patched manually) are no-ops.

INSERT INTO storage.buckets (id, name, public)
VALUES ('account_image', 'account_image', true)
ON CONFLICT (id) DO NOTHING;
