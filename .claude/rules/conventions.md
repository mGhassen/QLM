# Code Conventions

## Imports

### Aliases

- **`@guepard/*`** — any package import (e.g. `@guepard/ui/button`, `@guepard/domain/services`)
- **`~/*`** or **`@/*`** — app-internal imports (in `apps/web`, `@/*` maps to `./src/*`)

### Order (enforced by Prettier)

1. `server-only`
2. `react`
3. `react-router` / `@tanstack/react-router`
4. Third-party libraries (alphabetical)
5. `@guepard/*` packages (alphabetical)
6. `@/*` or `~/*` app-internal imports
7. Relative imports (`./`, `../`)

A blank line separates each group.

### Example

```ts
import 'server-only';

import { useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Notebook } from '@guepard/domain/entities';
import { useShell } from '@guepard/shell-runtime';
import { Button } from '@guepard/ui/button';

import { useWorkspace } from '@/lib/context/workspace-context';

import { NotebookCard } from './notebook-card';
```

Run `pnpm format:fix` to auto-sort.

## Validation (Zod 4)

- **Client**: `react-hook-form` + `@hookform/resolvers/zod`
- **Server**: `@hono/zod-validator`
- **Entities**: Zod schemas live alongside entity types in `packages/domain/src/entities/*.type.ts` — derive TS types via `z.infer<typeof Schema>`
- **Never use runtime validators other than Zod** — consistency matters

## Backend routes (Hono)

Routes use dependency-injected repositories:

```ts
export function createProjectsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', zValidator('json', createProjectSchema), async (c) => {
    const repos = await getRepositories(c);
    const input = c.req.valid('json');
    const project = await new CreateProjectService(repos.project).execute(input);
    return c.json(project, 201);
  });

  return app;
}
```

- Instantiate the domain service inside the handler, passing `repos.xxx`.
- Use `zValidator('json', schema)` for body validation and `zValidator('query', schema)` for query params.
- Wrap business logic errors with `handleDomainException(error)`.

## Frontend routes (TanStack Router)

Use file-based routing in `apps/web/src/routes/`:

```tsx
export const Route = createFileRoute('/prj/$projectSlug/$routeBase')({
  component: ContextualAppRoute,
});

function ContextualAppRoute() {
  const { projectSlug, routeBase } = Route.useParams();
  // ...
}
```

- **Dynamic segments**: `$param` (e.g. `$projectSlug.tsx`)
- **Splat**: `$.tsx` matches anything unmatched by siblings (accessed via `params._splat`)
- **Index**: `index.tsx` matches the parent path exactly
- **Layout (pass-through)**: a parent route file with `<Outlet />` shares layout with children

### URL structure (project shell)

- **Project root**: `/prj/{projectSlug}` → redirects to default app
- **App in project**: `/prj/{projectSlug}/{routeBase}` → contextual shell + app list view
- **Entity detail (flat short URLs)**: `/{flatPrefix}/{slug}` (e.g. `/notebook/my-nb`) → flat catch-all resolves project context from the entity
- **Org pages**: `/org/{slug}`, `/org/{slug}/members`, etc.

Project slugs are globally unique — the org is resolved from the project entity. Flat URLs are shareable and short.

### Path helpers

Use `apps/web/src/config/paths.config.ts` helpers:
- `createProjectPath(projectSlug)`
- `createProjectAppPath(projectSlug, routeBase)`
- `createFlatPath(prefix, ...params)`
- `createPath(template, slug)` for org templates with `$slug`

## Database types

Auto-generated from Supabase schema:
- **Never edit `database.types.ts` manually.**
- After schema changes, run `pnpm supabase:web:reset && pnpm supabase:web:typegen`.
- Use `Tables<'table_name'>` for type inference.

## Styling

- **Tailwind CSS 4** — utility-first; project presets in `tooling/tailwind/`
- **`cn(...)`** helper from `@guepard/ui/utils` for conditional classes
- **Shadcn primitives** (`@guepard/ui/button`, `@guepard/ui/dialog`, etc.) instead of hand-rolled HTML
- **Dark mode** via CSS variables — use `bg-background`, `text-foreground`, `bg-muted`, etc. instead of hardcoded colors
- **Lucide icons** via `lucide-react`

## Prettier

- 2 spaces, single quotes, 80 char width (config in `tooling/prettier/index.mjs`)
- Run `pnpm format:fix` before committing

## TypeScript

- Strict mode on, `es2017` target (config in `tooling/typescript/`)
- Enable `noUnusedLocals` / `noImplicitReturns` via the project base

## ESLint

- `tooling/eslint/base` and `tooling/eslint/react` configs
- **Custom rule**: enforces `@guepard/ui/trans` over `react-i18next/Trans` — do not disable
