# Spec — <Feature> (phase <N>)

| Field        | Value                                         |
| ------------ | --------------------------------------------- |
| Status       | Draft                                         |
| Author       | <name>                                        |
| Created      | <YYYY-MM-DD>                                  |
| Implements   | [RFC <id> — <title>](../rfcs/<id>-<slug>.md) |
| Target phase | Phase <N>                                     |

This document is the implementation spec for RFC <id>. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase <N>. Everything out of scope is deferred to its own phase and does not appear here.

---

## 1. Resolved open questions

One row per question from the RFC's open-questions section. Every question is resolved here — no "TBD" rows survive into the spec.

| # | Question                  | Resolution for phase <N>                                            |
| - | ------------------------- | ------------------------------------------------------------------- |
| 1 | …                         | …                                                                   |

## 2. User stories

Short bulleted list of the user-visible outcomes this phase delivers. Each bullet is a *capability a user gains*, not an implementation note. This section feeds `/spec-to-stories`.

- As a <role>, I can …
- As a <role>, I can …

## 3. Functional flow

### 3.1 Information architecture

Where in the app this feature lives. Sidebar bucket, route paths, how it relates to other primitives.

### 3.2 Screen-by-screen

One subsection per screen. Each describes the layout, the components it uses, the props those components take, and the empty / loading / error states.

### 3.3 User flows (happy paths)

Numbered step-by-step for each key action. Written from the user's perspective.

### 3.4 Error and edge-case behaviour

What goes wrong, how the UI handles it, what the server returns.

## 4. Technical flow

### 4.1 Layered sequence diagrams

One per primary operation. Domain → adapter → server → UI, showing which layer owns which responsibility.

### 4.2 Component split

Which code lives in `packages/features/<name>` (pure presentation) vs `packages/apps/<name>` (shell glue). See `.claude/rules/hexagonal-architecture.md`.

## 5. API contracts

### 5.1 Data shapes

Typescript-shaped definitions of every input / output DTO. Source of truth for the domain layer.

### 5.2 Endpoints

One row per HTTP endpoint: method, path, auth, request body, response body, status codes.

### 5.3 Rate limiting, pagination, caching

Per-endpoint details that affect server and client behaviour.

## 6. Data model

### 6.1 Schema

SQL DDL for new tables, columns, enums, indexes. One numbered migration file per table.

### 6.2 Config / payload contracts

Schemas for any `jsonb` / dynamic fields.

### 6.3 Secrets contract

What goes through `ISecretVault`, what never does, what serialises back to the browser.

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. Each subsection lists concrete files and the change each one makes. `/spec-to-stories` reads this section to derive stories.

### 7.1 Domain (`packages/domain`)
### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)
### 7.3 Shell runtime (`packages/shell-runtime`)
### 7.4 Server (`apps/server`)
### 7.5 Presentation — feature package (`packages/features/<name>`)
### 7.6 Shell app (`packages/apps/<name>`)
### 7.7 i18n (`packages/i18n`)

## 8. Permissions and RLS

Permission enum additions, RLS policy shape (read / insert / update / delete), reuse vs new permission decision.

## 9. Security checklist

Secret handling, rate limits, redaction, residual threats. Explicit list so the reviewer can tick it off.

## 10. Verification plan

### 10.1 Static checks

Typecheck, lint, format.

### 10.2 Unit tests

Which packages, which services, what branches.

### 10.3 Integration tests

Which flows, which containers (testcontainers), which fixtures.

### 10.4 End-to-end (Playwright)

Which user journeys.

### 10.5 Manual smoke

Step-by-step a human can follow in `pnpm dev` to prove the feature works.

## 11. i18n key map

Flat list of every new i18n key this phase introduces, grouped by UI area.

## 12. Implementation sequencing

Ordered list of the stories `/spec-to-stories` will produce. Each entry is one sentence. Stories can overlap in dependencies but cannot start until the stage they belong to has cleared its gates.

Stage A — types and UI scaffolding
Stage B — data and domain
Stage C — server
Stage D — web wiring
Stage E — polish and verification

## 13. Follow-ups (deferred, not in this phase)

Things that surfaced during spec writing but belong to a later phase.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- <YYYY-MM-DD> — <story id> — <one-line description of the deviation>
