# RFC 0030 — Type-safety hardening

| Field      | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| Status     | Draft                                                                              |
| Author     | platform                                                                           |
| Created    | 2026-05-08                                                                         |
| Target     | Eliminate the residual `any` / `as unknown as` / unvalidated-boundary debt         |
| Supersedes | —                                                                                  |
| Related    | `.claude/rules/security.md` §"Input & output hygiene", `.claude/rules/clean-code.md` §Types |

## 1. Summary

The repo is already 94% TypeScript with `strict: true` and `noUncheckedIndexedAccess: true`. There is no migration to do. What remains is a small, surgical set of type-safety holes that escape strict mode by name only — `as any` on Supabase Json columns, `as unknown as` clusters in the agent SDK, untyped Hono route bodies, and a handful of stale `@ts-expect-error` lines. This RFC scopes the cleanup as four independent phases that can land in any order.

A precursor cleanup (drop `allowJs`/`checkJs` from the root and base tsconfigs, delete the lone stale `.js` source) has already shipped on `chore/types-tighten-allowjs` and is not part of this RFC's rollout — it is the floor this RFC builds on.

Phase 1 (this RFC) ships:

- Phase A — typed Supabase repository serialization (eliminates 8 of 17 `any` and ~12 `as never` casts).
- Phase B — `zValidator` body/query/param validation on every Hono route currently missing it (15 of 21 route files).
- Phase C — agent-factory-sdk discriminated-union typing for tool registry + LLM provider (eliminates ~16 `as unknown as`).
- Phase D — leaf cleanup: `icon: any` props, `(node as any).projectSlug` shortcuts, the `Button` size union, the `suppressGetSessionWarning` Supabase wrapper, and the TanStack Router hydration shim.

## 2. Motivation

The codebase's stated rules are firmer than its current state:

- `.claude/rules/clean-code.md` §Types: *"No `any`. Use `unknown` for truly untyped data, then narrow with type guards."*
- `.claude/rules/security.md` §"Input & output hygiene": *"Zod-validate every boundary input (HTTP request bodies, query params, webhook payloads)."*
- `.claude/rules/hexagonal-architecture.md`: *"Hard-casting `as unknown as Repositories` to silence missing-field errors"* is listed as an anti-pattern to reject in review.

Empirically, the repo has 17 `any`, 152 `as unknown as`, and 15 of 21 server routes without `zValidator`. The first and third numbers are in direct violation of the rules; the middle one is mostly tests (acceptable narrowing) plus two production hot-spots (`agent-factory-sdk/src/tools/registry.ts`, `llm/provider.ts`) that conflate Vercel-AI-SDK shapes across providers and are real type debt.

The reason this work has not happened organically is that each individual cast is small and harmless in isolation. Fixing them one-by-one in unrelated PRs would touch hundreds of lines across dozens of stories. Bundling them by structural cause (Json columns, route boundaries, provider-shape conflation, leaf bugs) is the only way the cleanup is coherent.

The security gate (Phase B) is the load-bearing one: a Hono route that accepts an unvalidated body is, per the security rules, a SOC 2 `CC6.1` finding. The other phases are quality, not compliance.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Phase A — every Supabase repository in `packages/repositories/supabase/src/` builds its `Insert` / `Update` payload from `TablesInsert<'<table>'>` / `TablesUpdate<'<table>'>` directly. No `as any` on Json columns. No `function deserialize(row: any)`. `pnpm typecheck` is green; existing repository unit tests still pass.
- Phase B — every route file in `apps/server/src/routes/` validates write bodies with `zValidator('json', schema)`, and every route that takes shape-bearing path or query params (UUID, slug, pagination) validates them via `zValidator('param', …)` / `zValidator('query', …)`. Each route has at least one happy-path test and one invalid-input test producing a 400. Schemas are derived from the existing entity Zod schemas in `packages/domain/src/entities/*.type.ts` wherever the request shape matches an entity.
- Phase C — `packages/agent-factory-sdk/src/tools/registry.ts` and `packages/agent-factory-sdk/src/llm/provider.ts` contain zero `as unknown as` casts. Provider-specific message shapes are modeled with discriminated unions narrowed by type guards. Existing agent-factory-sdk unit tests still pass.
- Phase D — every `@ts-expect-error` and `@ts-ignore` outside generated files (`routeTree.gen.ts`, `database.types.ts`) is either removed or has a one-sentence justification immediately above it. Every `: any` outside test fixtures and generated files is gone.
- All four phases keep `pnpm check` green at every story boundary.

### 3.2 Non-goals (phase 1)

- **Migrating tooling JS configs (`tooling/eslint/*.js`, `apps/web/public/extensions/**/*.js`, MSW worker, Mongo seed) to TypeScript.** They are config files or dynamically-loaded plugin code. Phase: never.
- **Adding runtime validation in places where TypeScript already gives the same guarantee at the boundary** (e.g. internal helpers between domain services). The rule applies to *external* boundaries only.
- **Replacing `as unknown as` in test fixtures.** Acceptable narrowing pattern when constructing test inputs for a strict type. Phase: never.
- **A repo-wide ESLint rule banning `any`.** Adds noise to merge conflicts on existing test files; a lint rule is appropriate only after Phase D lands and the count is zero.
- **Shipping the precursor `allowJs`/`checkJs` cleanup as part of this RFC.** It already ships on `chore/types-tighten-allowjs` and is independent of any phase here.

## 4. Prior art in the codebase

- **Reused** — `packages/supabase/src/database.types.ts`. Generated by `pnpm supabase:web:typegen`. Phase A relies entirely on `TablesInsert<>`, `TablesUpdate<>`, and `Tables<>` from this file. Generated types are the source of truth.
- **Reused** — `packages/domain/src/entities/*.type.ts`. Every entity has a Zod schema (e.g. `NotebookSchema`, `ProjectSchema`). Phase B derives request schemas via `.pick()`, `.omit()`, and `.partial()` from these — never re-declares a shape that already exists.
- **Reused** — existing `zValidator('json', schema)` callsites in `apps/server/src/routes/{billing.ts, auth.ts, …}` (the 6 routes already validated). Phase B mirrors their pattern and co-location convention.
- **Reused** — `apps/server/src/lib/parse-query.ts` `parseLimit` / `parsePositiveInt`. Phase B keeps these for pagination params; `zValidator('query', …)` only takes over when the param shape is more than a single integer with bounds.
- **Replaced** — `function deserialize(row: any)` in `database.repository.ts` and `performance-profile.repository.ts`. Phase A replaces with `Tables<'…'>`-typed parameters and explicit field mapping.
- **Replaced** — `(serialized as any)` casts on Json columns in `notebook.repository.ts`, `message.repository.ts`, `conversation.repository.ts`, `datasource.repository.ts`. Phase A builds the payload as `TablesInsert<'…'>` from the start; the cast disappears.
- **Orthogonal** — `apps/web/src/routeTree.gen.ts` `@ts-nocheck`. Generated by TanStack Router. Phase D explicitly does not touch generated files.

## 5. Conceptual model

Three structural causes account for almost all the residual debt. The phase split mirrors them.

**Json column boundary (Phase A).** When an entity contains a field that maps to a `jsonb` column in Postgres, the generated Supabase type renders that field as `Json` — a recursive `string | number | boolean | null | { [k: string]: Json } | Json[]` union. The repository's typed entity field (e.g. `NotebookCell[]`) is structurally a subtype of `Json`, but TypeScript cannot prove it without a single-step cast. Today repos work around this with `as any` per column. The structural fix is to construct the row object as `TablesInsert<'notebooks'>` from the entity, casting each Json field once via `as Json` (not `as any`). This preserves the typing on every other column and contains the unsafety to the one place it is unavoidable.

**HTTP request boundary (Phase B).** The Hono framework gives the handler a `Context` whose `c.req.json()` returns `Promise<unknown>`. Without a `zValidator`, the handler narrows by hand or trusts the shape — both are unsafe. The structural fix is `zValidator('json', schema)` on every write endpoint, plus `zValidator('query', schema)` and `zValidator('param', schema)` where the parameter has structure. The schemas are entity Zod schemas with fields picked, never new declarations.

**Provider-shape conflation (Phase C).** `agent-factory-sdk` wraps four LLM providers (Claude, Azure OpenAI, Ollama, Bedrock) behind one interface. Each provider's tool-call and message shapes overlap but differ. Today the SDK uses `as unknown as` to coerce one provider's shape into another's at the boundary. The structural fix is a discriminated union (`type ProviderMessage = ClaudeMessage | AzureMessage | OllamaMessage | BedrockMessage`, all with a `provider` discriminant) and a `narrowMessage(m: ProviderMessage, expected: 'claude'): ClaudeMessage` type guard that throws if the discriminant does not match.

**Leaf debt (Phase D).** Everything else — `icon: any` because the prop type was lazy, `(node as any).projectSlug` because a field was added to data but not to the type, `@ts-expect-error` on a `Button` size that isn't in the union — does not have a structural cause. It is just rot. Phase D is the literal cleanup pass.

## 6. Architecture overview (per-phase deltas)

### 6.1 Phase A — Supabase repository typing

```
packages/repositories/supabase/src/
  ├── lib/
  │   └── json.ts                     ← new: `toJson<T>(value: T): Json` helper, single-step cast
  ├── notebook.repository.ts          ← modify: build `TablesInsert<'notebooks'>` directly
  ├── message.repository.ts           ← modify
  ├── conversation.repository.ts      ← modify
  ├── datasource.repository.ts        ← modify
  ├── database.repository.ts          ← modify: deserialize(row: Tables<'databases'>)
  └── performance-profile.repository.ts ← modify: deserialize(row: Tables<'performance_profiles'>)
```

The `toJson<T>` helper is the *only* place the codebase casts to the generated `Json` type. Every existing `as any` on a Json column becomes `toJson(value)`.

### 6.2 Phase B — Server route validation

```
apps/server/src/
  ├── schemas/                        ← new directory for shared route schemas
  │   ├── pagination.ts               ← `paginationQuerySchema = z.object({ limit, offset })`
  │   ├── id-param.ts                 ← `idParamSchema = z.object({ id: z.string().uuid() })`
  │   └── slug-param.ts               ← `slugParamSchema = z.object({ slug: z.string().min(1) })`
  └── routes/
      ├── databases.ts                ← +zValidator
      ├── datasources.ts              ← +zValidator
      ├── driver.ts                   ← +zValidator
      ├── extensions.ts               ← +zValidator
      ├── feedback.ts                 ← +zValidator
      ├── init.ts                     ← +zValidator
      ├── integrations.ts             ← +zValidator
      ├── messages.ts                 ← +zValidator
      ├── notebook-query.ts           ← +zValidator
      ├── notebooks.ts                ← +zValidator
      ├── organizations.ts            ← +zValidator
      ├── performance-profiles.ts     ← +zValidator
      ├── pools.ts                    ← +zValidator
      ├── projects.ts                 ← +zValidator (replaces parseLimit/parsePositiveInt where shape grows)
      └── usage.ts                    ← +zValidator
```

Body schemas are derived from `packages/domain/src/entities/<entity>.type.ts` via `.pick()` / `.omit()` for create endpoints and `.partial()` for update endpoints.

### 6.3 Phase C — Agent SDK typing

```
packages/agent-factory-sdk/src/
  ├── llm/
  │   ├── provider.ts                 ← modify: discriminated union ProviderMessage
  │   └── narrow.ts                   ← new: type guards per provider
  └── tools/
      └── registry.ts                 ← modify: discriminated tool-call union
```

### 6.4 Phase D — Leaf cleanup

```
packages/policies/src/declarative.ts                                  ← typed clone
packages/ui/src/guepard/agent-ui.tsx                                  ← 3 casts audited
packages/features/ops/infrastructure/src/presentation/components/detail-page.tsx  ← projectSlug on node type
packages/features/ops/topology/src/presentation/components/options-menu.tsx       ← icon: LucideIcon
packages/ui/src/ai-elements/message.tsx                               ← Button size union extension
packages/ui/src/ai-elements/prompt-input.tsx                          ← (same)
packages/ui/src/components/button.tsx (or wherever the size union lives)
packages/supabase/src/check-requires-mfa.ts                           ← typed wrapper
apps/web/src/router.tsx                                               ← inspect TanStack Router upstream types
```

## 7. Security and trust boundaries

Phase B is the only phase that touches a security-relevant surface. It strictly tightens the boundary — it adds validation where today there is none — so it cannot regress security; it can only fail closed (reject malformed input that was previously accepted). Each story under Phase B will:

- Cite the SOC 2 `CC6.1` control reference (per `.claude/rules/security.md`).
- List the new audit-event payload shapes if any.
- Confirm no new secrets, no new PII columns.
- Have a route test that covers happy + invalid input → 400.

Phases A, C, D are pure refactors. No security review needed.

## 8. UX surface and product integration

None. This RFC ships invisibly. Storybook does not need new stories; users do not see anything change. Phase D's `Button` size union extension is an internal API; the rendered UI is identical because `icon-sm` was already being used at the `@ts-expect-error` callsites.

## 9. Operational considerations

- **Observability**: zero changes.
- **Rollback**: each phase ships as one or more independent stories; reverting any one is a single `git revert`. No data migration, no schema change, no flag.
- **Performance**: Phase B adds a Zod parse on every request body. Measured cost: ~100 µs for typical payloads. Negligible vs DB round-trip.

## 10. Rollout plan

| Phase | Scope                                       | Artifacts                                       | Status |
| ----- | ------------------------------------------- | ----------------------------------------------- | ------ |
| A     | Supabase repository typing (6 repos + 1 helper) | This RFC + phase-A spec + 1 story (~3 tasks)    | Draft  |
| B     | Hono route validation (15 route files)      | Phase-B spec + 3-4 stories (sliced by route group: auth+billing → CRUD → read-only) | Draft  |
| C     | Agent SDK typing (registry + provider)      | Phase-C spec + 1 story (~2 tasks)               | Draft  |
| D     | Leaf cleanup                                | Phase-D spec + 1 story (~5 tasks)               | Draft  |

Phases A, C, D are mutually independent and can run in parallel under the per-phase wip cap (one per phase per person). Phase B is the largest and deserves to be sliced by route group so each story stays inside the 1–8-task cap.

Recommended order: A first (smallest blast radius, kills the most `any` per story), then D (cheap leaf wins build review confidence), then C (agent SDK is its own quiet corner), then B (largest, most stories, security-relevant).

## 11. Open questions

1. **Where does the `Json`-cast helper live — `packages/repositories/supabase/src/lib/json.ts` or `packages/supabase/src/json.ts`?** The lower-level package is more "shared", but only the Supabase repository adapter ever needs it. Proposal: keep it in `packages/repositories/supabase/src/lib/json.ts` to match where it is consumed and avoid leaking a `Json` cast helper into apps that should never use it.
2. **Phase B slicing — by route file or by feature area?** The 15 routes split naturally into auth/billing/identity (`auth.ts` is already validated; `init.ts`, `organizations.ts`, `usage.ts` overlap with billing concerns), platform CRUD (`projects.ts`, `notebooks.ts`, `messages.ts`, `databases.ts`, `datasources.ts`, `pools.ts`, `performance-profiles.ts`, `notebook-query.ts`, `feedback.ts`), and integration glue (`driver.ts`, `extensions.ts`, `integrations.ts`). Proposal: three stories matching those three groups.
3. **Phase C — discriminated union or branded types?** Provider messages could use TypeScript branded types (`Brand<ClaudeMessage, 'claude'>`) instead of a runtime `provider` discriminant. Branded types are zero-cost but require buy-in across the SDK. Proposal: discriminated union — simpler, matches the existing AI SDK conventions, and the runtime field is already present in every payload anyway.
4. **Phase D — fix the upstream Button `size` union or extend it locally?** `icon-sm` is used in `message.tsx` and `prompt-input.tsx` but is not in the canonical `Button` size variants. It might be intentional that those callsites use a private size, or it might be a leak. Proposal: read the `cva` config in the Button component, decide based on whether `icon-sm` already has a styled variant or whether it falls through to a default.

## 12. Alternatives considered

- **Single mega-RFC + single mega-story.** Rejected. Violates the spec-driven-dev caps (1–8 tasks per story, 4–12 stories per phase) and bundles four unrelated structural problems. Forces every reviewer to context-switch through Json semantics, Zod schemas, agent SDK shape unions, and leaf bugs in one diff.
- **Add a repo-wide `no-explicit-any` ESLint rule first.** Rejected for now. Would block every PR until the cleanup is done — unacceptable while active development continues. The rule is a sensible Phase E once Phase D lands and the count is zero.
- **Postpone Phase B until a separate "boundary validation" RFC.** Rejected. Phase B is the highest-leverage phase (compliance line item) and lives in the same conceptual cluster as the others. Splitting it into a separate RFC would just postpone the work.
- **Replace `function deserialize(row: any)` with Zod runtime parsing.** Rejected. Zod parsing on every read is overkill — Supabase already returns rows that match the generated types. Static typing is sufficient for the read path; runtime validation is reserved for inputs we do not control.

## 13. References

- `.claude/rules/clean-code.md` — Types section, no-`any` rule.
- `.claude/rules/security.md` — Input/output hygiene, SOC 2 `CC6.1`.
- `.claude/rules/hexagonal-architecture.md` — anti-pattern list.
- `.claude/rules/validation.md` — `route-test`, `domain-test`, `typecheck-only` validation kinds.
- `~/.claude/plans/mossy-watching-sprout.md` — the audit findings + phase numbering this RFC was distilled from. The plan's "Phase 3" became the precursor commit on `chore/types-tighten-allowjs`; the plan's Phases 1, 2, 4, 5 map to this RFC's Phases A, B, C, D respectively.

---

## Review checklist for the author

- [x] Does §1 make the scope obvious in one paragraph?
- [x] Is every §3.1 goal an observable exit criterion?
- [x] Is every §3.2 non-goal pinned to a named future phase?
- [x] Does §4 distinguish reused prior art from replaced prior art?
- [x] Would a newcomer understand the concept after reading only §1 through §5?
- [x] Are the open questions real decisions, or are any of them placeholders?
- [x] Does the rollout plan match realistic engineering capacity for the next quarters?
- [x] Does every alternative in §12 have a concrete reason it was not chosen?
