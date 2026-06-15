# Commands

Always use these commands when the user asks for common dev tasks.

## Install & run

```bash
pnpm install                   # Install dependencies (pnpm 10.18.1, Node 22.x)
pnpm dev                       # Start web + server in parallel
pnpm web:dev                   # Web app only (Vite, port 3000)
pnpm server:dev                # Server only (Bun, port 4096)
```

## Build & quality

```bash
pnpm build                     # Build all packages (Turborepo)
pnpm check                     # format:fix -> format -> lint -> typecheck -> build -> test
pnpm lint                      # ESLint all packages
pnpm lint:fix                  # ESLint with auto-fix
pnpm format:fix                # Prettier fix
pnpm typecheck                 # TypeScript checking
```

Run `pnpm typecheck` after any change — it catches most issues before runtime.

## Testing

```bash
pnpm test                                                   # All tests with coverage
pnpm test:watch                                             # Watch mode
pnpm --filter web test __tests__/specific.test.tsx          # Single test (web)
pnpm --filter server test __tests__/specific.test.ts        # Single test (server)
```

Tests: Vitest (jsdom for React, node for server). Server tests mock repositories via `__tests__/helpers/mock-repositories.ts`.

## Supabase

```bash
pnpm supabase:web:start        # Start local Supabase
pnpm supabase:web:reset        # Reset DB to schemas
pnpm supabase:web:typegen      # Generate TypeScript types from DB schema
```

After changing SQL schemas in `apps/web/supabase/schemas/`: run `supabase:web:reset` then `supabase:web:typegen`.

## Docker

```bash
pnpm docker:build && pnpm docker:run
```
