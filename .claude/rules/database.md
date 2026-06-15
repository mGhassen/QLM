# Database & Auth (Supabase)

See `packages/supabase/CLAUDE.md` for the full security guide. The rules below are mandatory.

## Row Level Security (RLS)

- **Always enable RLS on new tables.** No exceptions for "I'll add it later."
- **Use existing helper functions** for authorization checks:
  - `has_role_on_organization(org_id, role)`
  - `has_permission(resource_id, permission)`
  - `is_account_owner(account_id)`
- **Never use `SECURITY DEFINER` without explicit access checks.** If you need `SECURITY DEFINER`, wrap the body with an auth check that calls one of the helpers above.
- **Write explicit policies** for each operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Don't rely on `FOR ALL`.

## Schema migrations

- Schema files live in `apps/web/supabase/schemas/` as **numbered SQL files**.
- After any schema change:
  1. `pnpm supabase:web:reset` — rebuild the local database from schemas
  2. `pnpm supabase:web:typegen` — regenerate `database.types.ts`
- **Never edit `database.types.ts` manually.**
- Use `Tables<'table_name'>` from the generated types for row type inference.

## Adding a new table checklist

1. Add a numbered SQL file under `apps/web/supabase/schemas/`
2. Define the table columns, constraints, and indexes
3. `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
4. Define policies using the helper functions:
   ```sql
   CREATE POLICY "members can read" ON my_table
     FOR SELECT USING (has_role_on_organization(organization_id, 'member'));
   ```
5. Add triggers for `updated_at` maintenance if relevant
6. Run `pnpm supabase:web:reset && pnpm supabase:web:typegen`
7. Create the entity + repository port in `packages/domain`
8. Implement the repository in `packages/repositories/supabase` (or HTTP adapter)
9. Wire into `apps/web/src/lib/repositories-factory.ts`
10. Add a service (use case) + expose via `@guepard/shell-runtime` resources if apps need it

## Repository implementations

- **Supabase adapters** live in `packages/repositories/supabase/src/*.repository.ts`
- **HTTP adapters** (calling the server API) live in `apps/web/src/lib/repositories/*.repository.ts`
- Both implement the abstract port from `packages/domain/src/repositories/*.port.ts`
- **Do not skip the port.** Apps and services depend on the abstract class; the concrete class is only referenced in the factory.

## Auth

- Supabase Auth with session cookies
- `@guepard/supabase/browser-client` for the browser, `@guepard/supabase/server-client` for the server
- `useUser()` from `@guepard/supabase/hooks/use-user` to read the current user in React
- `useSignOut()` from `@guepard/supabase/hooks/use-sign-out` for logout

## Secrets

- Environment variables go in `apps/web/.env.local` and `apps/server/.env.local`
- **Never commit `.env.local`** — it's gitignored
- **Never paste real secrets into code or comments**
- Public-safe values (anon key, site URL) prefix with `VITE_` for client exposure; server-only secrets do not have that prefix
