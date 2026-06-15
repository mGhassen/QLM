# RFC 0028 — Supabase exit PoC

| Field      | Value                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------- |
| Status     | Draft                                                                                       |
| Author     | Hani Chalouati                                                                              |
| Created    | 2026-05-01                                                                                  |
| Target     | Phase 1 — fast, throwaway PoC that validates or invalidates the assumptions in 0010–0022    |
| Supersedes | —                                                                                           |
| Related    | 0010, 0011, 0012, 0013, 0014, 0015, 0016, 0017, 0018, 0019, 0020, 0021, 0022                |

## 1. Summary

The 13 auth-stack RFCs (0010–0022) describe a Supabase exit in fine narrative detail but rest on a stack of unverified hypotheses: that Better Auth supports a custom bcrypt verifier with on-login rehash, that `SET LOCAL app.user_id` survives PgBouncer transaction-pool mode at our QPS, that the existing 91 RLS policies compile unchanged when `auth.uid()` is reimplemented as a GUC reader, that Better Auth's organization-plugin schema lines up with the existing org tables, and several others. None of these has been run against real code.

This RFC scopes a deliberately minimal PoC whose only job is to convert each hypothesis into a fact (or a refutation) before any of the 13 RFCs leaves `Draft (stub)` for `Spec`. The PoC lives on a throwaway branch in this repo, runs the fewest probes possible to answer each question, ships **no production code, no tests, no migrations**, and produces one short findings document per probe that feeds back into the corresponding upstream RFC.

Better Auth is the *current candidate* in 0010–0022, but it is **not a hard requirement**. If the PoC surfaces a fatal blocker (e.g. no dual-verify hook), the findings can recommend a different auth provider (GoTrue self-hosted, Auth.js, Clerk, WorkOS, custom build) and the upstream RFCs amend accordingly. The probes are written against Better Auth first because it is the cheapest option to falsify; substitution happens only if a probe refutes.

**Phase 1 ships:** a throwaway branch `poc/supabase-exit` (or `poc/supabase-exit/<probe>` per probe), a runnable script per probe under `poc/<probe>/`, a one-page findings doc per probe under `docs/poc/0028/<probe>.md`, and §7's outcome table filled in with one row per probe. **Phase 2 (deferred):** the actual Supabase exit, executed via the 0010–0022 specs with their hypotheses now grounded in PoC findings.

## 2. Motivation

The auth migration is the largest single piece of architectural surgery the codebase has on its roadmap: 13 interconnected RFCs, 91 RLS policies, two FK-anchor tables, plus the storage subsystem. Every one of those 13 RFCs is currently `Draft (stub)`. The existing review of those RFCs surfaced ~7 confident claims that are actually unvalidated assumptions — claims the RFCs treat as settled but no one has executed against real Better Auth, real Postgres, or the real RLS surface.

The cost of being wrong on any one of them, discovered six weeks into spec drafting, is days-to-weeks of rework spread across multiple RFCs. The cost of being wrong on the worst of them — the dual-verify bcrypt rehash plugin — is the entire "zero password resets at cutover" promise in 0015 collapsing, which would force a different cutover strategy and trigger a customer-facing comms decision. The asymmetry is severe: a PoC is days; a discovery is weeks.

A PoC phase before specification work is the cheapest known way to move those claims from "we believe" to "we measured." It is not a tooling step or a developer-experience step — it is a risk-reduction step on the most expensive engineering programme on the roadmap. Its output is durable: findings docs become the foundation of the spec-stage `## Resolved open questions` tables in 0010–0022.

This RFC sits *upstream* of 0010–0022 in the dependency direction. Each of those RFCs gets unblocked for spec promotion only after its corresponding probe lands a finding (positive or negative). A negative finding does not block — it amends the upstream RFC to reflect the new constraint, then promotion proceeds.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- One throwaway PoC branch (`poc/supabase-exit`) exists in this repo containing one runnable script per probe under `poc/<probe>/` and one findings doc per probe under `docs/poc/0028/`.
- Every probe in §6.3 runs end-to-end against a local Postgres + a hello-world Hono app + the candidate auth provider (Better Auth first) — no shared dependency on `apps/server`.
- Each probe produces a findings doc following the §6.2 5-section template.
- §7.1's outcome table is filled in with one row per probe naming its outcome (✅ ratified / ⚠️ caveat / ❌ refuted) and a link to the findings doc.
- The PoC has **no tests, no CI, no quality gates** — only a working "happy path" that answers each probe's hypothesis. Goal velocity over correctness; this is a measurement, not a build.

### 3.2 Non-goals (phase 1)

- **No production code.** Phase 2 of this RFC (the actual exit, owned by 0010–0022 specs) writes the real implementation.
- **No tests.** Findings come from running the probe once and observing the result. PoC code is throwaway.
- **No migrations applied to a real database.** Probes use a local throwaway Postgres (Docker or `pglite`) — never a shared dev DB.
- **No worktree, no `/finish` validators, no hex review.** This RFC ships under a deliberately light SDD process — see §6.1. Heavy SDD ceremony resumes for 0010–0022's specs.
- **No commitment to ship Better Auth.** A failed probe could push the project toward a different provider (GoTrue self-hosted, custom). Phase 1 produces evidence, not allegiance.
- **Connection-pool / `SET LOCAL` benchmark deferred** to RFC 0011 spec stage. The 0011 spec must include a benchmark task before phase-1 implementation begins.
- **Realtime usage audit deferred** to whichever spec first claims to remove `apps/web`'s dependency on Supabase Realtime. If any spec in 0010–0022 turns out to need this answer earlier, it gets a one-bullet grep added during spec drafting — not a probe round.
- **Trigger torture test (`better_auth.user` → `public.users`) deferred** to RFC 0012 spec stage. The trigger is small enough to validate at spec time without a PoC probe.

## 4. Prior art in the codebase

- **Replaced (eventually, in phase 2 — owned by 0010–0022):** Supabase Auth, Supabase's `auth` schema, Supabase Storage, PostgREST's implicit JWT-claim injection. None of these are touched by *this* RFC.
- **Reused for the PoC:** the existing `apps/web/supabase/schemas/*.sql` files as the source of the 91 RLS policies that probe #2 will sample. Read-only — the PoC copies a representative subset into a local DB; it does not modify the source-of-truth schemas.
- **Orthogonal:** every other RFC in `docs/rfcs/` not in the 0010–0022 range. The PoC explicitly does not touch `0023-auth-desktop-client` (already shipped) or `0027-free-desktop-edition`.
- **Greenfield:** Better Auth has zero footprint in this repo today. Adopting it is a decision, not a continuation.

## 5. Conceptual model

A **probe** is the unit of work this RFC introduces. One probe answers exactly one hypothesis from upstream RFCs 0010–0022. A probe has four properties:

- **Hypothesis** — the upstream-RFC claim it tests, expressed as a sentence that can be true or false.
- **Upstream RFC link** — the RFC whose `Draft (stub)` → `Spec` promotion is gated on this probe.
- **Runnable artefact** — a tiny script, SQL file, or static-analysis pass, hosted under `poc/<probe>/` on the branch. Throwaway code; no tests; no production fitness.
- **Findings doc** — one page under `docs/poc/0028/<probe>.md`, fixed 5-section template (see §6.2). The durable artefact.

Probes are independent: order does not matter inside phase 1, and a probe failing does not block sibling probes. The findings doc is the unit that flows back upstream — each probe's `Recommendation` section is read into the corresponding upstream RFC during *its* spec drafting.

A probe outcome is one of three:

- **✅ ratified** — hypothesis confirmed; upstream RFC is unblocked unchanged.
- **⚠️ caveat** — hypothesis confirmed but with an unexpected constraint that the upstream RFC must reflect (e.g. version pin, edge-case carve-out).
- **❌ refuted** — hypothesis false; upstream RFC must be amended (and may need a different design) before promotion.

A refutation is a *successful* PoC outcome — that is the entire point. The PoC is "done" the moment every selected probe has emitted a findings doc, regardless of which symbol each one earned.

## 6. Probes

### 6.1 Process — deliberately light SDD

This RFC operates under a carve-out from the standard SDD ceremony, justified by the fact that no PoC code reaches `main`:

| Concern              | Standard SDD                                | This RFC (0028)                                                                |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Branching            | `.worktrees/<NNN>-<slug>/` per wip story    | Single branch `poc/supabase-exit` (or `poc/supabase-exit/<probe>`) — no worktree. **Branch is deleted after findings docs merge to `main`.** |
| Validators           | `typecheck-only` / `domain-test` / `e2e` etc | None. Probes "validate" by running once and producing observations               |
| Hex-architecture-reviewer | Required on story branch              | Skipped — PoC is not held to architectural rules                                |
| `/finish` ceremony   | Required for every status transition         | Optional. Status changes can be plain commits                                   |
| Rebase / fast-forward to `main` | Required at story close          | **Forbidden.** Branch is throwaway. Findings docs land on `main` via a normal PR/merge; PoC code does not |

Phase 2 (the real exit, in 0010–0022's specs) snaps back to the standard SDD process.

### 6.2 Findings-doc template (5 sections, fixed)

Every probe emits one Markdown file at `docs/poc/0028/<probe>.md`:

1. **Hypothesis.** The upstream-RFC claim being tested, quoted verbatim where possible.
2. **Method.** What was built, what was run, against what local Postgres / Better Auth version.
3. **Result.** What happened. ✅ / ⚠️ / ❌ in the heading. Numbers if applicable.
4. **Recommendation for upstream RFC.** A specific edit instruction for the named upstream RFC: *"0015 §1.X should change to read…"* or *"0014 spec must add an open question on field X."*
5. **Effort spent.** Calendar hours / days. Sanity check on whether the upstream RFC's complexity assumption is also right.

### 6.3 Probe set (phase 1)

Five probes, listed by upstream-RFC link (not by execution order — probes are independent).

| # | Probe                                | Upstream RFC | Hypothesis under test                                                                                  |
| - | ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------ |
| 1 | Better Auth hello-world stack-up     | 0012         | Better Auth + Hono + bare Postgres run an email/password signin flow end-to-end with no surprises.     |
| 2 | RLS GUC compatibility                | 0010 + 0011  | A representative subset (5–10) of `apps/web/supabase/schemas/*.sql` policies evaluates correctly when `auth.uid()` is reimplemented as a `current_user_id()` reader over a session-local GUC. |
| 3 | Dual-verify bcrypt → argon2id        | 0015         | Better Auth supports (or can be cheaply plugged with) a custom bcrypt verifier that rehashes to argon2id on successful login. Validates the "zero password resets at cutover" claim. |
| 4 | TOTP secret migration round-trip     | 0015         | A Supabase-format MFA TOTP secret can be imported into Better Auth's `twoFactor` plugin and produce valid codes — i.e. users do not need to re-enroll MFA at cutover. |
| 5 | Better Auth org plugin schema diff   | 0014         | The Better Auth `organization` plugin's emitted schema is "close to what already exists" — measured as: count of field renames, count of breaking shape differences, list thereof. |

Probe 1 is the foundation for probes 3 and 4 (they need a working Better Auth instance). Probes 2 and 5 are independent and can run first if desired.

## 7. Rollout plan

| Phase | Scope                                                                                                          | Artefacts                                                       | Status |
| ----- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| 1     | Five probes from §6.3 emit findings docs under `docs/poc/0028/`. This RFC's outcome table (below) is filled in. | This RFC + `poc/supabase-exit` branch + 5 findings docs on `main` | Draft  |
| 2     | The actual Supabase exit, executed via specs for RFCs 0010–0022 with their hypotheses now grounded in PoC findings. | Specs + stories + tasks under each upstream RFC                  | Future |

### 7.1 Outcome table (filled at end of phase 1)

| Probe                                | Upstream RFC | Outcome | Findings doc                         |
| ------------------------------------ | ------------ | ------- | ------------------------------------ |
| Better Auth hello-world stack-up     | 0012         | TBD     | `docs/poc/0028/01-stack-up.md`       |
| RLS GUC compatibility                | 0010 + 0011  | TBD     | `docs/poc/0028/02-rls-guc.md`        |
| Dual-verify bcrypt → argon2id        | 0015         | TBD     | `docs/poc/0028/03-dual-verify.md`    |
| TOTP secret migration round-trip     | 0015         | TBD     | `docs/poc/0028/04-totp-migration.md` |
| Better Auth org plugin schema diff   | 0014         | TBD     | `docs/poc/0028/05-org-schema-diff.md` |

## 8. Open questions

1. **Is Better Auth the right candidate, or should the PoC also evaluate alternative providers?** Better Auth is the cheapest first candidate (it's what 0010–0022 already assume), but the PoC's premise — *measure, don't assume* — applies to provider choice itself. Proposal: run the five probes against Better Auth first; if probe #3 (dual-verify) or probe #5 (org schema diff) ❌ refutes, the failing probe's findings doc adds a follow-up section recommending which alternative to evaluate next, and a phase-1.5 (single additional probe round) is opened. No alternative is evaluated unless a probe motivates it.

2. **What happens if a refuted probe blocks more than one upstream RFC at once?** Probes #3 and #4 both gate RFC 0015 directly, but probe #3 also indirectly gates 0012 (since dual-verify would live as a Better Auth plugin). Proposal: leave the cascade unrecorded here; let each upstream RFC's spec drafting consult the findings doc and decide its own posture. The findings doc names the upstream RFC explicitly in §6.2.4 — that's the contract.

3. **What's the PoC branch's relationship to a real `pnpm install`?** The branch will need its own dependencies (Better Auth, candidate auth providers if they enter scope) that are *not* in `main`'s `package.json`. Proposal: probes use a sibling `package.json` under `poc/` with its own lockfile, kept out of the workspace catalogue. Confirms at probe time. If this turns out to be friction, the `poc/` folder can move to a tmp directory entirely — the findings docs are what matters.

## 9. Alternatives considered

### 9.1 Auth-provider candidates

The PoC uses Better Auth as the *starting* candidate. The full candidate list, with the rejection / deferral reason for each:

- **Better Auth.** **Chosen as starting candidate.** Closest fit per the existing 0010–0022 study (MFA + org + account-linking plugins map 1:1 to current schemas). Cheapest first probe.
- **GoTrue (self-hosted).** **Deferred.** Would inherit Supabase Auth's API surface, easing migration, but doesn't solve the on-prem packaging story (still a Kong-shaped service to operate). Re-considered if Better Auth ❌ refutes on dual-verify.
- **Auth.js (NextAuth).** **Deferred.** Designed for Next.js / edge runtimes; the headless-on-Hono path is possible but less mature. Re-considered if Better Auth refutes.
- **Clerk / WorkOS (managed SaaS).** **Rejected.** Both are vendor-lockin replacements for Supabase Auth — they solve the "exit Supabase Auth" problem but reintroduce a hard dependency on a hosted service, which conflicts with the on-prem deployment goal already stated in 0023.
- **Custom build over `jose` + Postgres.** **Rejected.** Auth is the highest-stakes surface in the codebase; rolling it from scratch is the highest-cost-per-risk option. Only re-considered if every off-the-shelf candidate is refuted.
- **Lift Better Auth setup from a sibling repo.** **Checked, none exists today.** Recorded so future readers don't rediscover the question. `qwery-core` does not have a Better Auth integration.

### 9.2 Process alternatives

- **Skip the PoC; go straight to specs for 0010–0022.** Status quo before this RFC. Rejected because the unverified-hypothesis cost is days-to-weeks of rework spread across multiple specs — the asymmetry overwhelmingly favours a small upfront probe.
- **Embed probes inside each upstream RFC's spec drafting.** Rejected because (a) it conflates risk discovery with design and (b) it prevents a single probe from informing multiple RFCs (probe #3 informs 0012 and 0015; probe #4 also informs 0015) — separating them denies the probe its leverage.
- **Hire an auth-provider consultant for an architecture review.** Rejected because a review buys confidence, not measurement. A consultant cannot answer *"does this version's bcrypt verifier hook exist"* — only running it can.

## 10. References

- `.claude/rules/spec-driven-dev.md`
- `docs/rfcs/0010-auth-identity-data-model.md` through `docs/rfcs/0022-auth-storage-migration.md`
- `docs/rfcs/0027-free-desktop-edition.md` (related on-prem packaging context)
- Better Auth documentation (external) — to be linked once probes confirm the version pinned.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §9 have a concrete reason it was not chosen?
