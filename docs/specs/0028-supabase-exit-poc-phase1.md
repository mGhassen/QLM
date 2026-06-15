# Spec — Supabase exit PoC (phase 1)

| Field        | Value                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Status       | Draft                                                                          |
| Author       | Hani Chalouati                                                                 |
| Created      | 2026-05-01                                                                     |
| Implements   | [RFC 0028 — Supabase exit PoC](../rfcs/0028-supabase-exit-poc.md)              |
| Target phase | Phase 1 — five probes that ratify or refute the assumptions in RFCs 0010–0022  |
| Stories      | <placeholder — `/spec-to-stories` fills this>                                  |

This document is the implementation spec for RFC 0028 phase 1. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, the per-probe artefact contract, the implementation sequencing, and a verification plan.

Scope is strict to phase 1. Phase 2 (the actual Supabase exit, owned by the specs of RFCs 0010–0022) is not addressed here.

**This spec inherits the PoC carve-out from RFC 0028 §6.1.** Many sections of the gold spec template (`.claude/templates/spec.md`) genuinely do not apply to a PoC that ships no UI, no endpoints, no migrations, no domain entities, no tests, no i18n. Those sections are kept as headers and explicitly marked **N/A** with a one-line justification, rather than deleted — so future readers see what was deliberately skipped, not what was overlooked.

---

## 1. Resolved open questions

One row per question from RFC 0028 §8, plus one additional question surfaced during spec drafting (Q4).

| # | Question | Resolution for phase 1 |
|---|----------|------------------------|
| 1 | Is Better Auth the right candidate, or should the PoC also evaluate alternative providers (GoTrue self-hosted, Auth.js, Clerk, WorkOS, custom)? | |
| 2 | What happens if a refuted probe blocks more than one upstream RFC at once (e.g. probe #3 ❌ would gate both 0012 and 0015)? | |
| 3 | What is the PoC branch's relationship to a real `pnpm install` — does the probe code go in a sibling `package.json` under `poc/`, in a tmp directory entirely, or somewhere else? | |
| 4 | How does RFC 0028 §7.1's outcome table get populated, given the SDD invariant *"RFCs are immutable after `/rfc-to-spec`"* (`.claude/rules/spec-driven-dev.md` line 47)? Once this spec is scaffolded, the RFC body cannot be edited. | Resolution proposal: outcomes append to a new `## Amendments` section at the end of `docs/rfcs/0028-supabase-exit-poc.md` rather than mutating §7.1 in place. The §7.1 rows in the RFC stay frozen with `TBD` and the Amendments section is the canonical record of probe outcomes. *Confirm before phase 1 starts.* |

## 2. User stories

Each probe corresponds to one user-visible outcome. The "user" of a PoC is the RFC author / engineering team consuming the findings.

- As an RFC author, I have a published findings doc (`docs/poc/0028/01-stack-up.md`) that ratifies or refutes the upstream-RFC hypothesis behind probe #1 (Better Auth + Hono + bare Postgres email/password signin), with an explicit recommendation for RFC 0012's spec stage.
- As an RFC author, I have a published findings doc (`docs/poc/0028/02-rls-guc.md`) that ratifies or refutes the GUC-based `current_user_id()` replacement for `auth.uid()` against a representative subset (5–10) of the existing RLS policies, with an explicit recommendation for RFCs 0010 + 0011's spec stages.
- As an RFC author, I have a published findings doc (`docs/poc/0028/03-dual-verify.md`) that ratifies or refutes Better Auth's ability to verify legacy Supabase bcrypt hashes and rehash to argon2id on successful login, with an explicit recommendation for RFC 0015's spec stage and (if refuted) a named alternative provider to evaluate next.
- As an RFC author, I have a published findings doc (`docs/poc/0028/04-totp-migration.md`) that ratifies or refutes the round-trip migration of a Supabase-format TOTP secret into Better Auth's `twoFactor` plugin, with an explicit recommendation for RFC 0015's spec stage.
- As an RFC author, I have a published findings doc (`docs/poc/0028/05-org-schema-diff.md`) that quantifies the delta between Better Auth's `organization` plugin schema and the existing org tables (count of field renames, count of breaking shape differences, list thereof), with an explicit recommendation for RFC 0014's spec stage.
- *(Implicit, derived from Q4 above)* As an RFC author, the outcome of every probe is recorded in the RFC's `## Amendments` section once each finding lands on `main`.

## 3. Functional flow

### 3.1 Information architecture

*N/A — the PoC ships no UI. Probes are CLI scripts; outputs are Markdown findings docs.*

### 3.2 Screen-by-screen

*N/A — no screens.*

### 3.3 User flows (happy paths)

*N/A — no end-user flows. Probe-author flow is captured in §4.1 below.*

### 3.4 Error and edge-case behaviour

*N/A at user level — error handling for probe scripts is throwaway (one-shot scripts; no retry, no polish). What "goes wrong" inside a probe is itself the finding.*

## 4. Technical flow

### 4.1 Probe pipeline (single sequence diagram for all five probes)

```
[author]                  [poc/<probe>/]              [docs/poc/0028/]              [docs/rfcs/0028-...]
   |                            |                            |                              |
   |--- runs probe script ----->|                            |                              |
   |                            |--- writes scratch output ->|  (manual: author writes      |
   |                            |                            |   the 5-section findings doc)|
   |<--- review finding --------|                            |                              |
   |--- merges findings PR --->                              |--- (after merge) author      |
   |                                                         |    appends row to RFC's      |
   |                                                         |    ## Amendments section --->|
```

Notes:
- The "writes scratch output" step is whatever the probe naturally produces (logs, JSON, SQL transcripts). The author manually distils it into the 5-section findings template (RFC §6.2): Hypothesis / Method / Result / Recommendation / Effort spent.
- The Amendments append is the only edit the spec permits to the RFC after `/rfc-to-spec` runs.

### 4.2 Component split

*N/A — no `packages/features/<name>` or `packages/apps/<name>` involvement. PoC code is throwaway under `poc/<probe>/`; findings docs are plain Markdown.*

## 5. API contracts

### 5.1 Data shapes

*N/A — PoC ships no DTOs. Probe 1 reuses Better Auth's built-in shapes for the hello-world signin; no domain contract is introduced.*

### 5.2 Endpoints

*N/A — no production endpoints. Probe 1's hello-world Hono app may expose a route or two, but they are throwaway and not part of the contract surface.*

### 5.3 Rate limiting, pagination, caching

*N/A — no production endpoints, no caching surface.*

## 6. Data model

### 6.1 Schema

*N/A — phase 1 writes **no migrations** to `apps/web/supabase/schemas/`. Probe 2 copies a representative subset of existing policies into a local throwaway database; the source-of-truth schemas are read-only inputs to the probe.*

### 6.2 Config / payload contracts

*N/A — no production config introduced.*

### 6.3 Secrets contract

*N/A in production sense.* PoC-local note: probe scripts may reference local-only Postgres credentials and Better Auth dev secrets. These must be inlined as test-fixture values (or read from a local `.env`) and **must never appear in findings docs**. See §9.

## 7. File-by-file work items

The PoC does not follow the hexagonal layout — see §6.1 of the RFC for the carve-out. The standard sub-sections below are kept as headers for template fidelity but each is **N/A**; the actual file inventory is in §7.8.

### 7.1 Domain (`packages/domain`)

*N/A — PoC adds no domain code.*

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

*N/A — PoC adds no adapter code.*

### 7.3 Shell runtime (`packages/shell-runtime`)

*N/A — PoC adds no runtime code.*

### 7.4 Server (`apps/server`)

*N/A — PoC's hello-world Hono app lives under `poc/01-stack-up/`, not `apps/server`.*

### 7.5 Presentation — feature package (`packages/features/<name>`)

*N/A — no UI.*

### 7.6 Shell app (`packages/apps/<name>`)

*N/A — no shell plugin.*

### 7.7 i18n (`packages/i18n`)

*N/A — no user-facing strings.*

### 7.8 PoC artefacts

The actual phase-1 file inventory. All paths relative to repo root.

| # | Path                                        | Type             | Description                                                                                       |
| - | ------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| 1 | `poc/01-stack-up/`                          | Throwaway code   | Better Auth + Hono + bare Postgres hello-world. Includes its own `package.json` if needed (Q3).   |
| 2 | `poc/02-rls-guc/`                           | Throwaway code   | SQL fixtures + script that loads 5–10 policies, sets `app.user_id` via `SET LOCAL`, asserts allow/deny. |
| 3 | `poc/03-dual-verify/`                       | Throwaway code   | Better Auth instance seeded with one bcrypt-hashed user; signin script + assertion of rehash.     |
| 4 | `poc/04-totp-migration/`                    | Throwaway code   | Synthetic Supabase-format TOTP secret + Better Auth `twoFactor` import + code-verification probe. |
| 5 | `poc/05-org-schema-diff/`                   | Static analysis  | Script that emits Better Auth `organization` plugin SQL and diffs against `apps/web/supabase/schemas/`. Output is the diff itself, plus a one-line summary file. |
| 6 | `docs/poc/0028/01-stack-up.md`              | Findings doc     | 5-section template per RFC §6.2, recommending a posture for RFC 0012.                             |
| 7 | `docs/poc/0028/02-rls-guc.md`               | Findings doc     | 5-section template; recommendation for RFCs 0010 + 0011.                                          |
| 8 | `docs/poc/0028/03-dual-verify.md`           | Findings doc     | 5-section template; recommendation for RFC 0015. **If ❌, names a candidate alternative provider.** |
| 9 | `docs/poc/0028/04-totp-migration.md`        | Findings doc     | 5-section template; recommendation for RFC 0015.                                                  |
| 10 | `docs/poc/0028/05-org-schema-diff.md`      | Findings doc     | 5-section template; recommendation for RFC 0014.                                                  |
| (post-merge) | `docs/rfcs/0028-supabase-exit-poc.md` `## Amendments` | Append-only edit | One row per probe outcome, per Q4's resolution. |

## 8. Permissions and RLS

*N/A — no schema changes and no policy changes. Probe 2 operates against a local throwaway database with copies of existing policies; the source-of-truth `apps/web/supabase/schemas/` is read-only.*

## 9. Security checklist

- **No PoC code reaches `main`.** The branch `poc/supabase-exit` is deleted after findings docs merge. Findings docs do reach `main` and are reviewed for the items below.
- **No real customer data touched.** All probes use synthetic fixtures (test users with predictable emails, throwaway TOTP secrets, dummy bcrypt hashes generated in-script).
- **No live database hit.** Probes use Docker Postgres or `pglite` — never the dev or staging Supabase project.
- **No secrets in findings docs.** Probe scripts may reference local-only Postgres passwords and Better Auth dev secrets; these are **never quoted in the published Markdown**. Findings docs reference Better Auth versions and configuration *names*, not values.
- **No credentials committed to the PoC branch.** Use a local `.env` (gitignored) or inline test fixtures. CI does not run on the PoC branch.
- **No customer-comms commitment** is made by any finding. A ❌ refutation triggers an upstream RFC amendment, not a customer-facing announcement; that decision is owned by phase 2.

## 10. Verification plan

### 10.1 Static checks

*N/A — PoC carve-out. The probe scripts may pass a casual `tsc --noEmit` or be plain JS; either is fine.*

### 10.2 Unit tests

*N/A — PoC has no tests by design.*

### 10.3 Integration tests

*N/A — PoC has no tests by design.*

### 10.4 End-to-end (Playwright)

*N/A — no UI.*

### 10.5 Manual smoke (the actual phase-1 verification)

The phase is **done** when:

1. Each of the 5 paths under `docs/poc/0028/` exists on `main`, follows the 5-section template, and names its target upstream RFC explicitly in §4 (Recommendation).
2. Each of the 5 directories under `poc/<probe>/` exists on the `poc/supabase-exit` branch and contains at minimum a runnable script (or, for probe 5, a static-analysis output).
3. RFC 0028 has gained an `## Amendments` section with one row per probe (probe → outcome ✅/⚠️/❌ → findings-doc link) — per the Q4 resolution.
4. The `poc/supabase-exit` branch is deleted locally (not pushed).
5. RFC 0028 §7.1 in the body is **not** modified (immutability invariant).

A human reads the five findings docs and decides per upstream RFC whether to (a) promote the upstream RFC to `Spec` unchanged, (b) amend it first, or (c) hold pending phase-1.5 (additional probe round against an alternative provider). That decision is captured during *each upstream RFC's* eventual `/rfc-to-spec` run, not here.

## 11. i18n key map

*N/A — phase 1 introduces zero user-facing strings.*

## 12. Implementation sequencing

Three stages. The standard "Stage D — web wiring" and "Stage E — polish and verification" do not apply (no UI, no polish — the findings docs *are* the verification).

**Stage A — Foundation (single story).**

1. Probe #1 — Better Auth + Hono + bare Postgres hello-world stack-up. Foundation for probes #3 and #4. Story expected to take ~1 day.

**Stage B — Independent probes (two stories, may run in parallel).**

2. Probe #2 — RLS GUC compatibility against 5–10 representative policies. Independent of probe #1's stack.
3. Probe #5 — Better Auth org plugin schema diff. Static analysis; independent of every other probe.

**Stage C — Stack-dependent probes (two stories, depend on Stage A).**

4. Probe #3 — Dual-verify bcrypt → argon2id rehash. Critical-path: a ❌ here triggers a phase-1.5 alternative-provider evaluation.
5. Probe #4 — TOTP secret migration round-trip.

**Stage D — *(omitted — no polish phase in a PoC)*.**
**Stage E — *(omitted — verification is implicit in §10.5; no separate "verify" story).*

Total: **5 stories**, well within the 4–12 cap. Each story will use `validation: typecheck-only` per the carve-out (lightest legal validator) — see RFC §6.1.

## 13. Follow-ups (deferred, not in this phase)

- **Connection-pool / `SET LOCAL` benchmark.** Deferred to RFC 0011's spec stage. The 0011 spec must include a benchmark task before phase-1 implementation begins. (RFC 0028 §3.2.)
- **Realtime usage audit.** Deferred to whichever spec first claims to remove `apps/web`'s dependency on Supabase Realtime. If any spec in 0010–0022 needs the answer earlier, it gets a one-bullet grep added during spec drafting — not a probe round. (RFC 0028 §3.2.)
- **Trigger torture test (`better_auth.user` → `public.users`).** Deferred to RFC 0012's spec stage. (RFC 0028 §3.2.)
- **Phase-1.5 alternative-provider probe round.** Triggered only if probe #3 or probe #5 ❌ refutes against Better Auth. Scope: re-run the failing probe(s) against the alternative recommended in the originating findings doc. Not part of phase 1; opened on demand.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- *(none yet)*
