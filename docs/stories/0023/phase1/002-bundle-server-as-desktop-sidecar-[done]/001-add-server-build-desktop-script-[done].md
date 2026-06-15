---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/package.json
  - apps/server/scripts/build-desktop.ts
  - apps/server/.gitignore
validation:
  kind: typecheck-only
---

# Add server build:desktop script

Add a `pnpm --filter server build:desktop` entry point that compiles `apps/server/src/index.ts` into a standalone Bun binary at `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]` for the host triple.

## Done when

- [ ] `apps/server/scripts/build-desktop.ts` (or `.mjs`) runs `bun build --compile --target=bun-<triple> apps/server/src/index.ts --outfile <repo>/apps/desktop/src-tauri/binaries/api-server-<triple>` for the host triple. Triple resolved from `process.platform` + `process.arch` and matches qwery-core's set: `aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
- [ ] On Windows, `.exe` is appended to the output filename.
- [ ] The script ensures `apps/desktop/src-tauri/binaries/` exists before writing.
- [ ] `apps/server/package.json` `scripts.build:desktop` invokes `bun run scripts/build-desktop.ts`.
- [ ] `pnpm --filter server build:desktop` produces an executable file (`stat`-able and `+x`); fails clean with a non-zero exit when the host triple is unrecognised.
- [ ] `pnpm typecheck` stays green across the monorepo.
- [ ] `apps/server/.gitignore` (or root `.gitignore`) ignores any incidental compile output the script writes under `apps/server/`.

## Notes

- Spec anchor: `#74-server-appsserver`. Cross-compile matrix is story 010 — only the host triple is required here.
- Don't bundle / minify — `bun build --compile` already does the right thing for a single-file Bun runtime.
