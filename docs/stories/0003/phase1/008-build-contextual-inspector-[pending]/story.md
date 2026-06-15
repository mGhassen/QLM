---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#323-contextual-inspector-contextualinspector"
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
status: pending
started: null
finished: null
blocks:
  - "009-compose-layer-2-with-fixture-transitions"
blocked_by:
  - "002-define-display-types-and-fixtures"
  - "003-seed-environments-i18n-namespace"
---

# Build contextual inspector

## Goal

Ship `ContextualInspector` with its four slot sets (Source / Volume / Clone / Branch), plus `NodePickerPopover` and `BranchNameDialog`, rendered as a single Overview view with **no tabs** and **no "coming soon" placeholders** for deferred slots.

## Scope

**In scope**

- `src/components/contextual-inspector.tsx` + `contextual-inspector.stories.tsx` + `contextual-inspector.test.tsx`
  - Props: `{ selection: GraphSelection; graph: EnvironmentGraph; onClose: () => void; onCloneToNode: (sourceId: string, nodeId: string) => void; onCreateBranch: (cloneId: string) => void; }` as `Readonly<ContextualInspectorProps>`.
  - Layout: right-docked panel, 320px wide, full height, `border-l` from the graph area. Sticky header with selection title + close button. **No tab bar.**
  - Slot-set dispatch: switches on `selection.kind` and renders `SourceSlots` / `VolumeSlots` / `CloneSlots` / `BranchSlots`.
  - Escape key closes the inspector (keyboard accessibility).
- `src/components/inspector-slots/source-slots.tsx` — Source selection: provider badge + name (bold), status chip, `<ConnectionStringField />` (masked), volume label, default branch label, `"Clone to node"` action button that opens `<NodePickerPopover />`.
- `src/components/inspector-slots/volume-slots.tsx` — Volume selection: volume label, `"{N} clones"` count. Passive — no actions.
- `src/components/inspector-slots/clone-slots.tsx` — Clone selection: node label, status chip, `<ConnectionStringField />`, `"Create branch"` action button that opens `<BranchNameDialog />`. **No metric tiles, no lineage, no replication status, no empty placeholders** — deferred slots simply do not render.
- `src/components/inspector-slots/branch-slots.tsx` — Branch selection: parent clone name, branch name, created-at timestamp.
- `src/components/primitives/node-picker-popover.tsx` — Popover with a fixture list of nodes. Calls `onConfirm(nodeId)` when the user picks. Stories: Open / Empty / Closed.
- `src/components/primitives/branch-name-dialog.tsx` — Dialog with a pre-filled branch name input and confirm/cancel buttons. Validates non-empty input. Stories: Open / Prefilled / Closed.
- Colocated tests:
  - Slot-set switching: rendering the component with each `GraphSelection.kind` swaps content correctly.
  - Escape key closes the inspector.
  - `"Clone to node"` → node picker opens → confirm calls `onCloneToNode` with correct args.
  - `"Create branch"` → dialog opens → confirm calls `onCreateBranch` with correct args.

**Out of scope** (forces honest slicing)

- Wiring to `Layer2View` composition (→ Story 009).
- Actual fixture state transitions when `onCloneToNode` / `onCreateBranch` are called (→ Story 009 — this story stubs the callbacks and verifies they are invoked).
- Any metric tiles content, lineage section, masking panel, replication status panel, branch history panel — all are explicitly **not rendered**, not even as "coming soon" badges (per spec §1 row 5).
- A tab bar — explicit. Single Overview view.
- Wiring the inspector into any plugin-root (→ Story 009).

## Acceptance criteria

- [ ] `ContextualInspector` does not render a tab bar — single Overview view.
- [ ] Each of the 4 slot sets has a Storybook story in isolation.
- [ ] An aggregated "Selection swap" story changes the `selection` arg via Storybook controls and shows the slot set swap in real time.
- [ ] Deferred slots (metric tiles, lineage, masking, replication status, branch history) **do not render at all** — no `"—"` placeholders, no "coming soon" text, no empty div with a tooltip. Verified by grepping the new files for `TODO` / `coming soon` / `—` literals in JSX.
- [ ] Escape key closes the inspector — verified by a unit test with a keyboard event simulation.
- [ ] `NodePickerPopover` renders the fixture node list, calls `onConfirm(nodeId)` on selection, and disables confirm while no node is selected.
- [ ] `BranchNameDialog` pre-fills a generated name (e.g. `main-2`), validates non-empty input, and calls `onConfirm(branchName)` on confirm.
- [ ] No hardcoded English strings in any new file.
- [ ] `pnpm --filter @guepard/environments test` passes with coverage on slot-set switching, Escape close, popover confirm, dialog confirm.

## Tasks

Populated by `/start-story`.

1. [001-…](001-<slug>-[pending].md)

## Demo / verification

```bash
pnpm --filter @guepard/environments storybook
# Browse: Environments/ContextualInspector/SourceSelected
# Browse: Environments/ContextualInspector/VolumeSelected
# Browse: Environments/ContextualInspector/CloneSelected
# Browse: Environments/ContextualInspector/BranchSelected
# Browse: Environments/ContextualInspector/SelectionSwap (Storybook args)
# Browse: Environments/Primitives/NodePickerPopover/Open
# Browse: Environments/Primitives/BranchNameDialog/Open

pnpm --filter @guepard/environments test
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
