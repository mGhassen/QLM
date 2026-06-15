# Testing

## Framework

- **Vitest** for all packages
  - `jsdom` environment for React code
  - `node` environment for server code
- **Istanbul** coverage provider, `lcov` reporter
- **@testing-library/react** + `@testing-library/jest-dom` for component tests

## Commands

```bash
pnpm test                                                   # All tests with coverage
pnpm test:watch                                             # Watch mode
pnpm --filter web test __tests__/specific.test.tsx          # Single test (web)
pnpm --filter server test __tests__/specific.test.ts        # Single test (server)
pnpm --filter @qlm/domain test                          # One package
```

## Location

- Unit tests: next to the source file (`foo.ts` + `foo.test.ts`) **or** under a `__tests__/` folder at the package root
- Integration / route tests: under `__tests__/` at the package root
- Fixtures and helpers: `__tests__/helpers/`

## Server tests

Mock repositories via the existing helper:

```ts
import { createMockRepositories } from '../helpers/mock-repositories';

const repos = createMockRepositories();
repos.project.findById.mockResolvedValue(fakeProject);

// Pass into the route factory
const app = createProjectsRoutes(async () => repos);
```

- Don't hit a real database in unit tests.
- Use Hono's `app.request(...)` to exercise routes.

## Domain tests

- Test services in isolation with a **mocked repository** (plain object satisfying the abstract port).
- Assert behavior, not implementation (e.g. "creates the notebook with the expected id", not "calls `findById` once").
- Entity validation tests: assert Zod schemas catch invalid inputs.

## React component tests

- **Test behavior, not implementation details** — render, interact, assert what the user sees.
- Prefer `screen.getByRole(...)` over `getByTestId` when possible.
- Use `userEvent` from `@testing-library/user-event` for interactions.
- Wrap components that use `useShell()` with a mock `ShellAppProvider`.
- Mock React Query via a test `QueryClientProvider` with a fresh client per test.

## What to test

- **Domain services** — all branches (happy path, not-found, validation errors)
- **Repository adapters** — against a mock or local Supabase instance
- **Route handlers** — happy path + error paths + validation errors
- **React components with logic** — state transitions, user interactions, callbacks
- **Custom hooks** — via `renderHook` from `@testing-library/react`

## What NOT to test

- Trivial presentational components (no logic, no state)
- Types (TypeScript catches them)
- Third-party libraries (trust them)
- Internal implementation of memoization / useCallback stability

## Coverage

- Aim for high coverage on `packages/domain` (business logic is the most valuable test target)
- Coverage on presentation layers is less important — prefer a few high-value integration tests over 100% line coverage

## Storybook — mandatory for every UI-touching change

Every task or story that creates or modifies a React component in `packages/ui/*`, `packages/features/*`, or `packages/apps/*` MUST:

- **Ship at least one Storybook story per new component.** When a prop is renamed, removed, or added on an existing component, every existing story file for that component is updated in the same change.
- **Include a "Storybook validation" step** in the task's Test plan section (template field) and in the story's Demo / verification section.
- **Be visually validated by the user before the task is marked `[done]`.** Enforced by the `/finish` task branch for any task whose `layer:` is `features | plugin | ui` or whose `files:` touches `packages/ui/**`, `packages/features/**`, or `packages/apps/**`.

Rationale: typecheck and unit tests confirm the contract and the behavior, but neither catches a silent visual regression — e.g. a conditional button no longer rendering because a prop was renamed without updating the story's args. Storybook is the single cheap place to catch those before they ship.

**Per-package Storybook command**: `pnpm --filter <pkg> storybook`. If a package has no Storybook config yet and a task adds a visible component, adding the Storybook scaffold is part of that task's scope — mirror an existing configured package (e.g. `packages/features/accounts` or `packages/ui`).

**What this does NOT enforce**: automated visual-regression snapshots or screenshot diffing. Those are future work. Phase-1-style verification is a human eyeball on the Storybook run.
