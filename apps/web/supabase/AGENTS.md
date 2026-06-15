# Supabase Database Schema Management

This file contains guidance for working with database schemas, migrations, and Supabase development workflows.

## Schema Organization

Schemas are organized in numbered files in the `schemas/` directory. Numbers are used to sort dependencies.

## Schema Development Workflow

### 1. Creating New Schema Files

```bash
# Create new schema file
touch schemas/15-my-new-feature.sql

# Apply changes and create migration
pnpm --filter web run supabase:db:diff -f my-new-feature

# Restart Supabase with fresh schema
pnpm supabase:web:reset

# Generate TypeScript types
pnpm supabase:web:typegen
```

### 2. Modifying Existing Schemas

```bash
# Edit schema file (e.g., schemas/03-accounts.sql)
# Make your changes...

# Create migration for changes
pnpm --filter web run supabase:db:diff -f update-accounts

# Apply and test
pnpm supabase:web:reset
pnpm supabase:web:typegen
```

## Security First Patterns

## Add permissions (if any)

```sql
ALTER TYPE public.app_permissions ADD VALUE 'notes.manage';
COMMIT;
```

### Table Creation with RLS

```sql
-- Create table
create table if not exists public.notes (
  id uuid unique not null default extensions.uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade not null,
  -- ...
  primary key (id)
);

-- CRITICAL: Always enable RLS
alter table "public"."notes" enable row level security;

-- Revoke default permissions
revoke all on public.notes from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.notes to authenticated;

-- Add RLS policies
create policy "notes_read" on public.notes for select
  to authenticated using (
    account_id = (select auth.uid()) or
    public.has_role_on_organization(organization_id)
  );

create policy "notes_write" on public.notes for insert
  to authenticated with check (
    public.has_permission(auth.uid(), account_id, 'notes.manage'::app_permissions)
  );

create policy "notes_update" on public.notes for update
  to authenticated using (
    public.has_permission(auth.uid(), account_id, 'notes.manage'::app_permissions)
  )
  with check (
    public.has_permission(auth.uid(), account_id, 'notes.manage'::app_permissions)
  );

create policy "notes_delete" on public.notes for delete
  to authenticated using (
    public.has_permission(auth.uid(), account_id, 'notes.manage'::app_permissions)
  );
```

### Storage Bucket Policies

```sql
-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- RLS policy for storage
create policy documents_policy on storage.objects for all using (
  bucket_id = 'documents'
  and (
    -- File belongs to user's account
    qwery.get_storage_filename_as_uuid(name) = auth.uid()
    or
    -- User has access to the account
    public.has_role_on_organization(qwery.get_storage_filename_as_uuid(name))
  )
)
with check (
  bucket_id = 'documents'
  and (
    qwery.get_storage_filename_as_uuid(name) = auth.uid()
    or
    public.has_permission(
      auth.uid(),
      qwery.get_storage_filename_as_uuid(name),
      'files.upload'::app_permissions
    )
  )
);
```

## Function Creation Patterns

### Safe Security Definer Functions

```sql
-- NEVER create security definer functions without explicit access controls
create or replace function public.create_team_account(account_name text)
returns public.accounts
language plpgsql
security definer  -- Elevated privileges
set search_path = '' -- Prevent SQL injection
as $$
declare
  new_account public.accounts;
begin
  -- CRITICAL: Validate permissions first
  if not public.is_set('enable_team_accounts') then
    raise exception 'Team accounts are not enabled';
  end if;

  -- Additional validation can go here
  if length(account_name) < 3 then
    raise exception 'Account name must be at least 3 characters';
  end if;

  -- Now safe to proceed with elevated privileges
  insert into public.accounts (name, is_personal_account)
  values (account_name, false)
  returning * into new_account;

  return new_account;
end;
$$;

-- Grant to authenticated users only
grant execute on function public.create_team_account(text) to authenticated;
```

### Security Invoker Functions (Safer)

```sql
-- Preferred: Functions that inherit RLS policies
create or replace function public.get_account_notes(target_account_id uuid)
returns setof public.notes
language plpgsql
security invoker  -- Inherits caller's permissions (RLS applies)
set search_path = ''
as $$
begin
  -- RLS policies will automatically restrict results
  return query
    select * from public.notes
    where account_id = target_account_id
    order by created_at desc;
end;
$$;

grant execute on function public.get_account_notes(uuid) to authenticated;
```

### Safe Column Additions

```sql
-- Safe: Add nullable columns
alter table public.accounts
add column if not exists description text;

-- Safe: Add columns with defaults
alter table public.accounts
add column if not exists is_verified boolean default false not null;

-- Unsafe: Adding non-null columns without defaults
-- alter table public.accounts add column required_field text not null; -- DON'T DO THIS
```

### Index Management

```sql
-- Create indexes concurrently for large tables
create index concurrently if not exists ix_accounts_created_at
on public.accounts (created_at desc);

-- Drop unused indexes
drop index if exists ix_old_unused_index;
```

## Testing Database Changes

### Local Testing

```bash
# Test with fresh database
pnpm supabase:web:reset

# Test your changes
pnpm run supabase:web:test
```

## Type Generation

### After Schema Changes

```bash
# Generate types after any schema changes
pnpm supabase:web:typegen
# Types are generated to src/lib/supabase/database.types.ts

# Reset DB
pnpm supabase:web:reset
```

### Using Generated Types

```typescript
import { Enums, Tables } from '@qwery/supabase/database';

// Table types
type Account = Tables<'accounts'>;
type Note = Tables<'notes'>;

// Enum types
type AppPermission = Enums<'app_permissions'>;

// Insert types
type AccountInsert = Tables<'accounts'>['Insert'];
type AccountUpdate = Tables<'accounts'>['Update'];

// Use in functions
async function createNote(data: Tables<'notes'>['Insert']) {
  const { data: note, error } = await supabase
    .from('notes')
    .insert(data)
    .select()
    .single();

  return note;
}
```

## Common Schema Patterns

### Audit Trail

Add triggers if the properties exist and are appropriate:

- `public.trigger_set_timestamps()` - for tables with `created_at` and `updated_at`
  columns
- `public.trigger_set_user_tracking()` - for tables with `created_by` and `updated_by`
  columns

### Useful Commands

```bash
# View migration status
pnpm --filter web supabase migration list

# Reset database completely
pnpm supabase:web:reset

# Generate migration from schema diff
pnpm --filter web run supabase:db:diff -f migration-name

# Apply specific migration
pnpm --filter web supabase migration up --include-schemas public
```
