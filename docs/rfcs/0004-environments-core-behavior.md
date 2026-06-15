# RFC 0004 — Environments: core behavior

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| Status     | Placeholder — not yet drafted                           |
| Author     | Hani Chalouati                                          |
| Created    | 2026-04-11                                              |
| Target     | Phase 1 — orchestration, ingest boundary, live wiring   |
| Supersedes | —                                                       |
| Related    | RFC 0002 (Nodes) — hard upstream; RFC 0003 (Environments UI / UX) — sibling, drafted first |

## 1. Intent

This RFC will define the **core behavior** that sits behind the environments UI defined in RFC 0003 — the clone-to-node orchestration, the ingest boundary with RFC 0002, the lifecycle-event stream contract, the shell-runtime resource that feeds the display types, and the failure model for live operations.

It is **not yet drafted**. Per the sequential split agreed during RFC 0003 drafting, this RFC is drafted only after RFC 0003 is spec'd, so that RFC 0003's display types and mockups become the fixed UX contract this RFC's wiring has to satisfy.

## 2. When to draft

Draft this RFC when **both** of the following are true:

- RFC 0003's phase-1 spec has been scaffolded via `/rfc-to-spec 0003 1`.
- RFC 0002 has published at least a skeleton of its node control-plane contract — enough to answer "what does the console call to ask a node to ingest a source, and what stream does it subscribe to for lifecycle events".

Until both conditions hold, this file remains a placeholder.

## 3. Scope (sketch, not commitments)

The intended scope when drafting begins:

- The orchestration workflow: clone-to-node and create-branch actions, issued as control-plane calls against RFC 0002.
- The ingest boundary: a clean restatement that ingestion lives inside the node, not in the console — no console-side ingester process.
- The shell-runtime resource (`shell.environments.*`) that replaces RFC 0003's fixture adapter and produces data shaped exactly like RFC 0003's display types.
- The lifecycle-event stream contract between the node and the console (event types, ordering guarantees, reconnection semantics).
- The failure model for orchestration (how `ingest_failed` is surfaced, retry ergonomics, permanent-failure vs. transient-failure taxonomy).
- Security considerations specific to orchestration (permissions delegated to RFC 0002, rate limiting on the clone-to-node action, audit trail).
- Data model extensions — if any. The expectation is **none**: clones and branches are owned by RFC 0002, not mirrored in the console DB.

## 4. What is out of scope

- Anything visual. The UI shape is fixed by RFC 0003. If a change in core behavior implies a UI change, that is an amendment to RFC 0003, not new content here.
- Anything about how a source becomes bytes on a node. That is RFC 0002's responsibility.
- Anything about credentials on a user's cloud account. That is RFC 0001's responsibility.

## 5. Carry-over from RFC 0003 `/draft-rfc` Q&A

The following decisions were made during the pre-split RFC 0003 Q&A rounds and apply to this RFC when it is drafted. They do not need to be re-asked.

- **No console-side ingester process.** Ingestion lives inside the node. Permanent.
- **No backup file upload in the console.** Dump-based ingestion is an out-of-band concern users handle themselves against the node.
- **Frozen-fork model in phase 1.** Initial ingestion terminates at root commit. Continuous replication is phase 2.
- **Branch UX in phase 1 is create + list only.** No delete, no diff, no merge.
- **Lifecycle-event time axis in phase 1 ticks on lifecycle events only.** Per-commit rendering is phase 3.
- **Hard dependency on RFC 0002.** This RFC cannot be drafted until RFC 0002 surfaces its control-plane contract.
- **Soft dependency on RFC 0001 (Integrations).** Phase 1 does not exercise an integration path. Cloud-provider snapshot pulls are phase 3.

## 6. References

- `docs/rfcs/0003-environments.md` — UX / UI RFC. This RFC's wiring satisfies the display-type contract exported there.
- `docs/rfcs/002-nodes.md` — RFC 0002; hard upstream.
- `docs/rfcs/0001-integrations.md` — RFC 0001; soft upstream in phase 1.
- `.claude/rules/spec-driven-dev.md` — the sequential-RFC pattern this document participates in.
