# Monorepo Architecture

**Stack**: pnpm workspaces + Turborepo, Node 22.x, pnpm 10.18.1.

## Apps

- **`apps/web`** — React 19 SPA, TanStack Router (file-based in `src/routes/`), Vite, TanStack Query, Zustand, Shadcn UI, Tailwind CSS 4
- **`apps/server`** — Hono API on Bun (port 4096), routes in `src/routes/`, repository pattern
- **`apps/desktop`** — Electron wrapper

## Packages

### Foundation (no internal deps)

- **`packages/domain`** — entities, services (use cases), repository interfaces (ports), exceptions, DTOs, enums. **Pure TypeScript. No React, no React Query, no HTTP, no framework.**
- **`packages/shell-contracts`** — shell plugin types: `PluginManifest`, `FlatRouteDef`, nav types. Pure TS, no React.

### Data access adapters

- **`packages/repositories/supabase`** — Supabase implementations of the `domain` repository ports
- **`apps/web/src/lib/repositories/`** — HTTP-backed repository implementations that call the server API

### UI layer

- **`packages/ui`** — Shadcn/Radix component library with Tailwind. Depends on `domain` + `shared`.
- **`packages/features/*`** — Feature-specific presentation components (e.g. `notebook`, `accounts`). Depend on `domain` for types and `ui` for primitives.
- **`packages/apps/*`** — Thin app plugins: `manifest.ts` + `plugin-root.tsx`. Each app is discovered at build time via the shell app registry.

### Runtime & integration

- **`packages/shell-runtime`** — React context + typed data client for shell apps (`useShell()`, `ShellAppProvider`). Composes repositories, auto-injects project context, exposes a namespaced promise-based API per resource (notebooks, datasources, projects, etc.).
- **`packages/shared`** — utilities, logger (Pino), hooks
- **`packages/supabase`** — Supabase client wrappers, auth utilities, generated DB types
- **`packages/i18n`** — react-i18next with JSON locale files
- **`packages/agent-factory-sdk`** — AI agent SDK (Claude, Azure OpenAI, Ollama, Bedrock via Vercel AI SDK)
- **`packages/extensions-sdk`** / `extensions-loader` / `extensions` — datasource connector plugin system
- **`packages/telemetry`** — OpenTelemetry integration

## Dependency flow (strict)

```
apps/web, apps/server
   ↓
features/*, apps/*, shell-runtime
   ↓
ui
   ↓
domain, shell-contracts
```

- `domain` has **zero** internal dependencies.
- Inner layers never import from outer layers.
- `ui` depends on `domain` and `shared`.
- `shell-runtime` depends on `domain` only.
- Feature packages (`packages/features/*`) and app packages (`packages/apps/*`) **cannot import from `apps/*`**. Host-specific logic belongs in the host.

## Shell app discovery (build-time)

- Apps live at `packages/apps/{name}/` with `src/manifest.ts` and `src/plugin-root.tsx`.
- `apps/web/src/shell/app-registry.ts` discovers them via Vite `import.meta.glob` — no codegen.
- Plugin-root must default-export a list-view component; may also export `FlatRoot` (detail view) and `resolveProjectContext` (for flat routes).
