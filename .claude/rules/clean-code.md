# Clean Code Rules

Follow these rules when writing or modifying code. Reject PRs that violate them.

## Naming

- **Intention-revealing names.** `const u = users.filter(x => x.a)` → `const activeUsers = users.filter(user => user.isActive)`.
- **No abbreviations** except well-known ones (`id`, `url`, `api`, `ui`, `db`).
- **Booleans** are questions: `isLoading`, `hasError`, `canEdit`, `shouldRefresh`.
- **Functions** are verbs: `createNotebook()`, `resolveProjectContext()`.
- **React components** use PascalCase and describe what they render: `NotebookList`, `EntityListPage`.
- **Hooks** start with `use`: `useShell`, `useFlatRoute`.
- **Files** use kebab-case: `project-shell-frame.tsx`, `create-notebook.usecase.ts`.

## Function size & responsibility

- **Single Responsibility Principle.** Each function / component / module does one thing.
- **Prefer small functions.** If a function exceeds ~50 lines, consider extracting helpers.
- **Extract when you copy-paste.** Three similar usages = time to extract (rule of three).
- **Avoid flag parameters** (`doThing(true)`). Split into two functions or pass an enum / discriminated union.

## Types

- **No `any`.** Use `unknown` for truly untyped data, then narrow with type guards.
- **Prefer `type` for unions / intersections; `interface` for object shapes meant to be extended.** (Project convention.)
- **Readonly props** on React components: `function Foo(props: Readonly<FooProps>)`.
- **Derive types from schemas** — entities are `z.infer<typeof Schema>` in `packages/domain`.
- **Never edit `database.types.ts` manually** — regenerate via `pnpm supabase:web:typegen`.
- **Use `Tables<'table_name'>`** for Supabase row type inference.

## Error handling

- **Throw domain exceptions** from services — `DomainException.new({ code, overrideMessage, data })`. Don't throw plain `Error` in `packages/domain`.
- **Handle errors at boundaries** — catch in the route layer or React Query error callback, not deep inside business logic.
- **Never swallow errors silently.** If you catch, either rethrow, log via `@qlm/shared/logger`, or surface to the user.
- **User-facing errors** go through `toast` / `sonner` or inline form errors — never `alert()` except for destructive confirm() prompts.

## Immutability

- **Prefer immutable updates.** Use `{ ...state, field: value }` / `[...list, item]` / spread in setters.
- **Never mutate props or external state** inside components.
- **Domain entities are value objects** — treat them as frozen snapshots.

## DRY & YAGNI

- **DRY** — three repetitions triggers extraction. Two may still be fine if they'll diverge.
- **YAGNI** — don't add abstractions for speculative future needs. Build what's needed now; refactor when the second caller appears.
- **Don't add configuration options "just in case."** Every prop / option / flag has a cost.

## Comments

- **Comments explain _why_, not _what_.** The code should explain what.
- **Remove dead code** instead of commenting it out. Git history keeps it.
- **No `// TODO: fix this later`** — either fix it now or create a tracked issue.
- **JSDoc on public exports** when behavior isn't obvious — especially for shared packages (`domain`, `shell-runtime`, `ui`).

## React specifics

- **Prefer function components with hooks.** No class components.
- **Extract custom hooks** when state logic is reused across components.
- **Memoize selectively.** Don't wrap everything in `useMemo` / `useCallback` — only when measurable perf matters or it stabilizes deps for another hook.
- **Use `Suspense` for async boundaries** where React Query or lazy loading is involved.
- **Lazy-load heavy components** (`React.lazy`) for route-level code splitting.

## File organization

- **Co-locate tests** next to the code: `foo.ts` + `foo.test.ts` (or in `__tests__/` folder at the package root).
- **Index files** only re-export — no logic.
- **One component per file** for top-level components. Small helpers can live in the same file.

## Avoid backwards-compat hacks

- When renaming, actually rename — don't leave a deprecated alias unless an external caller depends on it.
- When removing code, delete it cleanly. Don't leave `// removed` comments or orphan exports.
- Don't add feature flags for changes that can be made directly.

## When an approach fails

- Diagnose the root cause. Read the error, check assumptions, try a focused fix.
- Don't retry the identical action blindly.
- Don't abandon a viable approach after one failure — but also don't keep digging when the premise is wrong.
