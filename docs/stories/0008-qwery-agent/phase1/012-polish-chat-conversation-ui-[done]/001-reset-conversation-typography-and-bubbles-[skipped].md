---
story: ./story.md
status: skipped
layer: features
model: sonnet
files:
  - packages/ui/src/qlm/ai/conversation-content.tsx
  - packages/ui/src/qlm/ai/chat-ui-config.ts
validation:
  kind: typecheck-only
---

# Reset conversation typography and bubble layout

Kill the monospace-everywhere look in the conversation surface. User and assistant message prose should render in the app's sans-serif body font at the body scale. Code blocks + inline code + tool-call output remain monospace. User messages become right-aligned, rounded, muted-background bubbles; assistant messages stay left-aligned as prose with the Qwery avatar in the left gutter only on the first message of a turn.

## Done when

- [ ] `packages/ui/src/qlm/ai/conversation-content.tsx` applies the app's body font (`font-sans` or whichever class the design system uses for body copy) to user + assistant message text. No `font-mono` on prose containers.
- [ ] Code blocks (`<pre>`, `<code>`), tool-call regions, and any JSON / SQL preview UI keep `font-mono`.
- [ ] User messages: right-aligned, rounded corners, `bg-muted` (or equivalent Tailwind token), max-width capped around 52ch so long messages wrap at a readable column. Not a full-width text node.
- [ ] Assistant messages: left-aligned, no bubble background, normal prose spacing. Avatar in the left gutter only when the message is the first of an assistant turn (consecutive assistant messages collapse the avatar).
- [ ] Text size matches the app's body scale — whatever class `packages/ui` uses for regular prose elsewhere (check an existing view in `apps/web` for the baseline). No oversized headlines inside messages except the ones authored via markdown `#` / `##`.
- [ ] Prompt input (placeholder + typed text) uses the same body font.
- [ ] `chat-ui-config.ts` — if any mono-font switches live here (e.g. a default class applied by a ChatProvider), flip them.
- [ ] `pnpm --filter @qlm/ui typecheck` passes.

## Notes

- Visual regression is caught by the Storybook task (002). That task updates the `conversation-content` + `chat-with-tool-calls` stories and the user eyeballs them.
- Do NOT introduce new tokens in `tooling/tailwind/*` — use what's already available (`text-foreground`, `text-muted-foreground`, `bg-muted`, etc.). If the palette is genuinely insufficient, flag it in the story's Questions surfaced.
- Take the cue from qwery-enterprise's `conversation-content.tsx` for reference — same primitive in that repo renders the chat correctly.

## Skipped because

Attempts to shrink prose via wrapper-level Tailwind classes failed — `Streamdown` (the markdown renderer inside `MessageContent`) applies its own `prose` typography with higher specificity, and the `text-base` on `MessageContent` itself is inherited by the rendered `<p>` / `<li>` elements. DevTools confirmed `font-size: 1rem` persisted through every wrapper-level override tried. Proper fix needs a Streamdown `components` prop override or a scoped `prose` CSS block — either requires touching `ai-elements/message.tsx` or `streamdown` config, outside the scope I was able to scope cleanly here. Moved to follow-up story `013-fix-chat-message-layout`.
