# Hexagonal Architecture

Strict separation between business logic, adapters, and presentation. Respect these rules in every change.

## The layers (innermost → outermost)

1. **Domain** (`packages/domain`) — pure business logic
   - Entities, value objects, enums (Zod-validated)
   - Services (use cases) — classes that orchestrate domain operations
   - Repository **ports** (abstract classes / interfaces) — define what the domain needs from persistence
   - DTOs for input/output of use cases
   - Exceptions
   - **Zero dependencies on React, HTTP, databases, React Query, or any framework**

2. **Adapters** — implementations of domain ports
   - `packages/repositories/supabase/*` — direct Supabase adapters
   - `apps/web/src/lib/repositories/*` — HTTP adapters calling the server API
   - Adapters implement the abstract repository classes from `domain/repositories`

3. **Application / runtime** (`packages/shell-runtime`) — React-aware glue
   - Exposes a typed data client (`useShell()`) that wires adapters + domain services
   - Auto-injects project context (projectId, orgSlug)
   - Provides promise-based resource namespaces (`shell.notebooks.list()`, `shell.query.run()`)
   - **Apps must use this, not domain services directly**

4. **Presentation** (`packages/ui`, `packages/features/*`, `packages/apps/*`)
   - `packages/ui` — generic Shadcn-based primitives + qlm-branded components
   - `packages/features/*` — presentational feature components (e.g. `NotebookUI`, `NotebookList`). Receive data via props or `useShell()`. **Do not instantiate domain services.**
   - `packages/apps/*` — thin shell plugins: manifest + plugin-root. Plugin-root wires `useShell()` queries/mutations to feature components.

5. **Host** (`apps/web`) — owns the routing, providers, and repository factory
   - `lib/repositories-factory.ts` constructs concrete adapters and provides them via `WorkspaceContext`
   - Routes wrap the shell with `<ShellAppProvider>` from `@qlm/shell-runtime`

## Mandatory rules

- **Domain is pure.** No `import from '@tanstack/react-query'`, no `import from 'react'`, no `fetch`, no `@supabase/*` inside `packages/domain`.
- **Services accept repositories via constructor injection.** Never hard-code adapter classes in domain code.
- **Repository ports are abstract classes in `domain/repositories/*.port.ts`.** Implementations live outside `domain`.
- **Apps use `useShell()` for data access.** Apps never `new CreateNotebookService(...)` directly — the shell runtime handles that.
- **Feature components stay presentational.** They accept data + callbacks as props (or consume `useShell()` internally). No direct repository access.
- **Host provides the adapters.** `apps/web/src/lib/repositories-factory.ts` is the single place where concrete adapters are constructed and wired into context.

## When adding a new capability

1. **Domain first.** Add entity/DTO + repository port method + service (use case) in `packages/domain`. No other packages yet.
2. **Implement the adapter.** Add the method to the relevant adapter in `packages/repositories/supabase/*` or `apps/web/src/lib/repositories/*`.
3. **Expose it in the shell client.** Add to the matching resource under `packages/shell-runtime/src/resources/*.ts`.
4. **Consume it.** In an app or feature component, call `shell.<resource>.<method>(...)` via React Query.

## Anti-patterns (reject during review)

- ❌ Importing `@qlm/repository-supabase` from a feature or app package — use the shell client instead
- ❌ Instantiating domain services inside React components — use the shell client
- ❌ Putting React hooks inside `packages/domain` — domain must stay pure
- ❌ Apps importing from `apps/web` — app packages cannot depend on the host
- ❌ Adding `@tanstack/react-query` to `packages/domain` — use it in the runtime/presentation layers only
- ❌ Hard-casting `as unknown as Repositories` to silence missing-field errors — wire all repositories properly
- ❌ Skipping the port abstraction and directly typing a repository as its concrete class

## Example: correct flow for "create a notebook"

```ts
// 1. Domain service (packages/domain/src/services/notebook/create-notebook.usecase.ts)
export class CreateNotebookService implements CreateNotebookUseCase {
  constructor(private readonly repo: INotebookRepository) {}
  public async execute(input: CreateNotebookInput): Promise<NotebookOutput> {
    const entity = NotebookEntity.create(input);
    return NotebookOutput.new(await this.repo.create(entity));
  }
}

// 2. Shell runtime resource (packages/shell-runtime/src/resources/notebooks.ts)
async create(input: { title: string; projectId?: string }) {
  return new CreateNotebookService(repository).execute({
    projectId: input.projectId ?? currentProjectId,
    title: input.title,
  });
}

// 3. App consumer (packages/apps/notebook/src/plugin-root.tsx)
const shell = useShell();
const createMutation = useMutation({
  mutationFn: () => shell.notebooks.create({ title: 'Untitled' }),
  onSuccess: () => shell.notebooks.invalidate.list(),
});
```

Notice the app never touches `INotebookRepository`, services, or entities — only the typed shell client and entity **types** for props.
