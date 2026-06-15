# Design System — Industrial Precision UI

> Reference: `packages/features/ops/nodes/src/presentation/`. Every token and recipe below is already in use there. Use that feature as the visual source of truth when adapting another page.

This app is an **industrial-grade operational tool**, not a consumer SaaS dashboard. Every UI decision should feel precise, dense, technical, high-contrast, minimal, fast. Premium comes from clarity and structure — never decoration.

---

## 1. Non-negotiables

1. **No rounded corners.** `rounded-none` everywhere — cards, dialogs, buttons, badges, inputs, dropdowns, sheets, skeletons, icon containers, bars, dots. Never `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-full`.
2. **No gradients, no glows, no glossy overlays.** No `bg-gradient-*`. Hierarchy comes from solid fills, borders, spacing, contrast.
3. **`border-2` for structure.** Cards, dialogs, selected states, inputs, stat cells, tag chips, icon tiles. `border` (1px) is reserved for hairline dividers only.
4. **`font-black uppercase tracking-widest` for operational text.** Labels, CTAs, section headers, chips, stat units. `font-semibold` is for flowing data (names, form values).
5. **Every clickable element gets `cursor-pointer`.** Buttons, chips, dropdown items, icon tiles, card surfaces.

If a change violates any of these, stop and reconcile with the user before coding.

---

## 2. Geometry tokens

| Token          | Class                                                        |
| -------------- | ------------------------------------------------------------ |
| Corner radius  | `rounded-none`                                               |
| Primary border | `border-2 border-border`                                     |
| Hairline       | `border-t border-border/50` (between form sections only)     |
| Selected card  | `border-foreground bg-primary/5`                             |
| Hover card     | `hover:bg-muted/40 hover:border-foreground`                  |
| Focus ring     | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |

---

## 3. Typography

Family: **Inter** (project default). Never introduce a new family.

| Role             | Classes                                                           | Where                          |
| ---------------- | ----------------------------------------------------------------- | ------------------------------ |
| Page / sheet title | `text-xl font-black tracking-tight uppercase leading-none`      | Sheet headers, dialog titles   |
| Card title       | `text-[16px] font-black leading-none truncate uppercase tracking-tight` | `NodeCard` identity row  |
| Section heading  | `text-[10px] font-black uppercase tracking-[0.4em]` + trailing `h-[2px] flex-1 bg-border` rule | Sheet sections (`NodeSection`) |
| Form label       | `text-xs font-black uppercase tracking-[0.15em] text-foreground/70` | `LABEL_CLASS` in sheets       |
| Button / CTA     | `font-black uppercase tracking-widest text-xs`                    | All footers, AlertDialog actions |
| Status chip      | `text-[10px] font-black uppercase tracking-widest leading-none`   | `HealthStatusBadge`            |
| Data row label   | `text-[11px] font-black uppercase tracking-[0.2em]`               | `DataRow`                      |
| Stat unit        | `text-[9px] font-black uppercase tracking-widest opacity-80`      | `ResourceCard` units           |
| Stat number      | `text-4xl font-black tracking-tighter tabular-nums leading-none`  | `ResourceCard` values          |
| Body data        | `text-sm font-semibold`                                           | Form inputs, select values     |
| Metadata / timestamps | `text-[11px] font-mono tabular-nums`                         | `LastSeenDot`, timeline times  |
| Monospace ident  | `font-mono text-xs` (or `text-[11px]`)                            | IDs, IPs, regions, clusters    |

Never use `font-medium` or `font-normal` for operational surfaces. Either `semibold` (data) or `black` (structure/CTA).

---

## 4. Sizing & density

| Element                         | Height / Spacing                                              |
| ------------------------------- | ------------------------------------------------------------- |
| Input / Select trigger          | `h-10`                                                        |
| Primary / secondary buttons     | `h-10` (sheets, forms)                                        |
| Dialog CTAs                     | `h-12` (destructive + cancel, equal-width, `flex-1`)          |
| Destructive confirm input       | `h-14` (name-to-delete prompt)                                |
| Icon-only button                | `h-7 w-7` (hero action row) or `h-8 w-8` (card menu)          |
| Pagination icon button          | `h-8 w-8`                                                     |
| Toolbar ghost button            | `h-10 px-3`                                                   |
| Status chip                     | `h-5 px-2`                                                    |
| Card stat chip                  | `h-9 px-3`                                                    |
| Icon tile (card identity)       | `h-12 w-12`                                                   |
| Icon tile (table row)           | `h-9 w-9`                                                     |
| Card padding                    | `p-4`                                                         |
| Sheet header padding            | `px-6 pt-6 pb-4`                                              |
| Sheet body padding              | `px-6 py-6`                                                   |
| Sheet footer padding            | `px-6 py-3`                                                   |
| Dialog padding                  | `p-8`                                                         |
| Section gap inside sheet        | `gap-6` between sections, `space-y-5` within a form           |
| Field column gap                | `gap-4` (two-column grid)                                     |

Reject oversized inputs, giant labels, excessive vertical whitespace. If something looks airy, it's wrong for this app.

---

## 5. Color & status tokens

Keep status palettes centralized in a `constants.ts` next to the feature (see `packages/features/ops/nodes/src/presentation/constants`). Never inline status colors in markup.

### Node-style status palette (copy-paste when adding a status-bearing feature)

```ts
export const STATUS_ICON_BG = {
  running: 'bg-emerald-500/10',
  draining: 'bg-amber-400/10',
  stopped:  'bg-muted/50',
  error:    'bg-destructive/10',
};

export const STATUS_ICON_BORDER = {
  running: 'border-emerald-500/40',
  draining: 'border-amber-400/40',
  stopped:  'border-muted-foreground/20',
  error:    'border-destructive/40',
};

export const STATUS_ICON_COLOR = {
  running: 'text-emerald-600',
  draining: 'text-amber-500',
  stopped:  'text-muted-foreground/60',
  error:    'text-destructive',
};

export const STATUS_CHIP = {
  running:  'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  draining: 'bg-amber-500/15  text-amber-700  border-amber-500/30  dark:text-amber-400',
  stopped:  'bg-muted text-muted-foreground border-border',
  error:    'bg-destructive/15 text-destructive border-destructive/30',
};
```

### Semantic colors only — never hex literals in JSX

Use `bg-background`, `bg-card`, `bg-muted`, `bg-muted/20..60`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`, `bg-destructive`. Provider brand hexes (`#FF9900`, `#34A853`, `#0078D4`) are the only accepted literals and must be mapped once per feature (see `PROVIDER_STYLES`).

### Grey guardrail

Greys must survive both themes. Don't drop below `text-muted-foreground` for text or `border-border/50` for dividers. No `text-gray-400`.

---

## 6. Component recipes

Every recipe below is lifted directly from `packages/features/ops/nodes`. When you adapt a surface elsewhere, start from the recipe and only change the data — not the class tokens.

### 6.1 Card (grid item)

Ref: `node-card.tsx`.

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={...}
  className={cn(
    'relative bg-card rounded-none border-2 p-4 flex flex-col gap-3 h-full',
    'cursor-pointer transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    selected
      ? 'border-foreground bg-primary/5'
      : 'border-border hover:bg-muted/40 hover:border-foreground',
  )}
>
  {/* Row 1 — identity: icon tile (h-12 w-12) + title + status chip + absolute top-right menu */}
  {/* Row 2 — stat trio: three h-9 chips `flex-1 basis-0 bg-muted border-2 border-border/80` */}
  {/* Row 3 — absolute footer: LastSeenDot bottom-left, provider badge bottom-right */}
</div>
```

- Cards use `[container-type:inline-size]` with inline `@container` media queries to hide labels progressively (`.hide-label-compact`, `.hide-ram-compact`, `.hide-date-compact`). Reuse the same breakpoints when porting.
- Selection mode replaces the identity icon with a `Checkbox` inside the same 12×12 tile — never add a separate checkbox column.

### 6.2 Sheet (details / create)

Ref: `node-details-sheet.tsx`, `node-create-sheet.tsx`.

```tsx
<SheetContent
  side="right"
  className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] border-l-2 border-border bg-background rounded-none"
>
  <div className="shrink-0 border-b-2 border-border bg-muted/20 px-6 pt-6 pb-4">
    {/* Hero: 12×12 status tile + title (text-xl font-black uppercase) + inline action row */}
  </div>

  <div className="flex-1 overflow-y-auto custom-scrollbar">
    {/* Either form (px-6 py-6 space-y-5) or read-mode sections (py-6, gap-6) */}
  </div>

  <div className="shrink-0 border-t-2 border-border px-6 py-3 bg-muted/30">
    {/* Footer: two equal flex-1 buttons, h-10, font-black uppercase tracking-widest text-xs */}
  </div>
</SheetContent>
```

Rules:
- Hero is always `border-b-2`, body scrolls, footer is always `border-t-2`. No floating actions inside the body.
- Create uses max-width `sm:max-w-[520px]`, details `sm:max-w-[480px]`. Don't invent new widths.
- Resource summary cards at the top of details use `ResourceCard` (stat + unit, `text-4xl font-black` number).

### 6.3 Dialog (destructive confirm)

Ref: `node-details-sheet.tsx` → `AlertDialog`, `nodes-list-page.tsx` → delete confirm.

```tsx
<AlertDialogContent className="rounded-none sm:rounded-none border-2 border-border bg-background max-w-md p-8">
  <AlertDialogTitle className="text-xl font-black uppercase tracking-tight mb-3">…</AlertDialogTitle>
  <AlertDialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest leading-relaxed">…</AlertDialogDescription>

  {/* Type-to-confirm input: h-14, font-black uppercase text-center tracking-widest */}

  <AlertDialogFooter className="mt-10 gap-3 sm:gap-3 sm:justify-center">
    <AlertDialogCancel className="rounded-none font-black uppercase tracking-widest text-xs flex-1 h-12 border-2 m-0 cursor-pointer" />
    <AlertDialogAction   className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-xs flex-1 h-12 border-2 m-0 cursor-pointer" />
  </AlertDialogFooter>
</AlertDialogContent>
```

Both `rounded-none` and `sm:rounded-none` are required because Shadcn's default re-rounds at `sm:`.

### 6.4 Status chip

Use `HealthStatusBadge` directly rather than rebuilding. If you need a new status family, add the palette to `STATUS_CLASSES` and keep the shape:

```
inline-flex items-center rounded-none border px-2 h-5
text-[10px] font-black uppercase tracking-widest leading-none
```

### 6.5 Resource stat (sheet)

```tsx
<div className="group bg-muted border-2 border-border p-4 rounded-none relative overflow-hidden transition-all hover:bg-background hover:border-foreground">
  <div className="absolute top-2.5 right-2.5 text-muted-foreground/40">{icon}</div>
  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">{label}</p>
  <div className="flex items-baseline gap-2">
    <span className="text-4xl font-black tracking-tighter tabular-nums leading-none">{value}</span>
    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-80">{unit}</span>
  </div>
</div>
```

### 6.6 Data row

```tsx
<div className="flex items-center justify-between group py-1.5">
  <div className="flex items-center gap-4 text-muted-foreground">
    <div className="p-2 bg-muted border-2 border-border rounded-none group-hover:bg-foreground group-hover:text-background group-hover:border-foreground transition-all">{icon}</div>
    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
  </div>
  <span className="text-xs font-black uppercase tracking-widest text-foreground">{value ?? '—'}</span>
</div>
```

Mono variant: add `font-mono text-[11px] text-foreground/70` to the value span.

### 6.7 Section header (inside sheet)

```tsx
<h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-6 flex items-center gap-4">
  {title}
  <div className="h-[2px] flex-1 bg-border" />
</h3>
```

### 6.8 Timeline item

```tsx
<div className="flex items-start gap-6 group">
  <div className="relative flex flex-col items-center self-stretch pt-2">
    <div className={cn("h-3.5 w-3.5 rounded-none ring-4 ring-background border-2 border-border z-10", dotColor)} />
    <div className="absolute top-2 w-[2px] h-full bg-border group-last:hidden" />
  </div>
  <div className="flex-1">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1 opacity-80">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-sm font-black uppercase tracking-tight">{formatRelative(date)}</span>
      <span className="text-[11px] font-black text-muted-foreground tabular-nums tracking-widest opacity-60">{new Date(date).toLocaleString()}</span>
    </div>
  </div>
</div>
```

### 6.9 Tag chip (clickable)

```tsx
<button className="group flex items-center gap-1.5 bg-muted border-2 border-border px-2.5 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background hover:border-foreground transition-all cursor-pointer">
  <Tag className="h-2 w-2 opacity-60 group-hover:opacity-100" />
  {tag}
</button>
```

Active state (when the tag is also a selected filter): `border-foreground bg-foreground text-background`.

### 6.10 Form field (inside a sheet)

Reuse the `LABEL_CLASS` / `INPUT_CLASS` / `SELECT_TRIGGER_CLASS` / `MESSAGE_CLASS` constants from the sheet files — do not redefine them per-field.

```ts
const LABEL_CLASS          = 'text-xs font-black uppercase tracking-[0.15em] text-foreground/70 block';
const INPUT_CLASS          = 'rounded-none border-2 border-border bg-muted/40 h-10 text-sm font-semibold focus-visible:ring-0 focus-visible:border-primary px-3';
const SELECT_TRIGGER_CLASS = 'rounded-none border-2 border-border h-10 bg-muted/40 font-semibold px-3 text-sm cursor-pointer';
const MESSAGE_CLASS        = 'text-[11px] font-black uppercase text-destructive';
```

Number inputs must strip browser spinners:
```
[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
```

### 6.11 Bulk action bar & selection mode

- The whole card/row IS the selection target when selection mode is active — no separate checkbox column.
- First card selected sets `lastSelectedCardId`; subsequent shift-clicks select the range (`nodes-list-page.tsx`). Reuse this pattern; don't invent a new one.
- Bulk bar lives above the list, uses `BulkActionBar` from `@guepard/ui/data-table-advanced`.

### 6.12 Empty & error states

```tsx
<Empty className="min-h-[280px]">
  <div className="flex flex-col items-center gap-3 text-center">
    <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border">
      <Icon className="text-muted-foreground h-6 w-6" />
    </div>
    <p className="text-foreground text-base font-semibold">{title}</p>
    <p className="text-muted-foreground mx-auto max-w-md text-sm">{description}</p>
    <div className="mt-2 flex items-center gap-2"> {/* primary + optional outline docs link */} </div>
  </div>
</Empty>
```

Error: `border-destructive/40 bg-destructive/10 text-destructive rounded-none border p-4` with an `AlertTriangle` + retry button.

---

## 7. Motion

Allowed:

- Instant transitions (`transition-all duration-150`) on hover, selection, focus.
- Row / card **state-change flashes** — a single parent-level sweep via `node-flash-{status}` class driving a `--wave-color` CSS variable (see `apps/web/styles/nodes.css`). When adding flashes for another entity, copy the whole recipe — don't animate individual cells.
- Pulse only for **live-signal** dots (`LastSeenDot` `fresh` bucket, running status dot).

Forbidden:

- Bounce, float, decorative motion.
- Per-element enter animations on list items.
- Spinners inside already-animated regions (except `Loader2` in CTA buttons during submit).

---

## 8. Page shell composition

Ref: `nodes-list-page.tsx`.

```
EntityListPage                        ← title, description, search, primary CTA, options slot
  ├─ BulkActionBar                    ← elevated row, only visible when selection > 0
  ├─ FilterChipRow                    ← active filter chips, each dismissible
  ├─ QuickFilterBar                   ← pinned per-column quick filters (status is always pinned)
  ├─ Error | Loading skeleton | EmptyFirstRun | EmptyFiltered | (grid | table)
  │    • grid → VirtuosoGrid + NodeCard, custom pagination footer with cols/rows selects
  │    • table → DataTableAdvanced with sticky name + sticky actions column
  ├─ NodeDetailsSheet                 ← right sheet, 480px
  ├─ NodeCreateSheet                  ← right sheet, 520px
  └─ AlertDialog (delete confirm)     ← type-to-confirm
```

Store user preferences via `createPreferenceStore(...)` with a single namespaced key (see `useNodesPrefs`). Don't sprinkle `localStorage` calls.

---

## 9. Search & keyboard

- Search inputs: `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}` (already defaulted by the shared `Input`).
- Keyboard shortcut hints belong inside the input as subtle `text-muted-foreground text-[10px]` badges — never as floating tooltips.
- Cards and rows are both Enter-activatable (`onKeyDown={e => e.key === 'Enter' && ...}`).

---

## 10. Migration checklist (apply when porting another page)

Before opening the PR, walk this list against the diff:

- [ ] No `rounded-*` other than `rounded-none`.
- [ ] No `bg-gradient-*`, no `shadow-lg/xl`, no decorative glow.
- [ ] Structural borders are `border-2`; hairlines are `border` with `/50` opacity.
- [ ] Every clickable element has `cursor-pointer`.
- [ ] Operational text is `font-black uppercase tracking-widest` (or `tracking-[0.15..0.4em]`). Data text is `font-semibold`.
- [ ] Status colors come from a central `constants.ts`, not inline.
- [ ] All strings go through `t(...)` / `Trans` from `@guepard/ui/trans`. No hardcoded English.
- [ ] Form constants (`LABEL_CLASS`, `INPUT_CLASS`, `SELECT_TRIGGER_CLASS`, `MESSAGE_CLASS`) are reused, not re-declared inline.
- [ ] Sheets: border-l-2, hero `border-b-2`, footer `border-t-2`, body scrolls via `overflow-y-auto custom-scrollbar`.
- [ ] Dialogs: `rounded-none sm:rounded-none border-2 p-8`, CTAs `h-12 flex-1 font-black uppercase tracking-widest text-xs`.
- [ ] Bulk / selection reuses `BulkActionBar`, shift-range pattern from `nodes-list-page.tsx`.
- [ ] Preferences go through `createPreferenceStore`.
- [ ] Light & dark mode verified — no `text-gray-*`, no hex literals in JSX outside provider brand colors.
- [ ] `pnpm typecheck` passes (mandatory after every change).

---

## 11. Anti-patterns (reject in review)

- ❌ Re-introducing `rounded-md` / `rounded-lg` because "it looks softer."
- ❌ `bg-gradient-to-*` for headers, status indicators, or "glow."
- ❌ `font-medium` on labels or CTAs.
- ❌ Per-row enter animations, confetti, bounce, float.
- ❌ Icon-only buttons without `aria-label`.
- ❌ Status color declared inline (`className="bg-emerald-500/10 ..."`) instead of via shared constants.
- ❌ Separate checkbox column on cards — the identity tile IS the selection target.
- ❌ Floating action buttons inside sheet bodies — actions live in the bordered footer.
- ❌ `alert()` / `confirm()` for destructive actions — use the type-to-confirm `AlertDialog` pattern.
- ❌ `Trans` imported from `react-i18next` — must come from `@guepard/ui/trans` (ESLint enforces).

---

## 12. When in doubt

Open `packages/features/ops/nodes/src/presentation/` side-by-side and mirror the equivalent surface. If something you need genuinely doesn't exist there, propose the new pattern **in this doc first**, then build it — so the next feature inherits the same vocabulary instead of diverging.
