---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/src-tauri/capabilities/default.json
  - apps/desktop/src-tauri/build.rs
  - apps/desktop/src-tauri/icons/
validation:
  kind: typecheck-only
---

# Add Tauri Cargo manifest and config

Stand up the Rust crate manifest and Tauri configuration so subsequent tasks can compile against `tauri = "2"` and have a window definition + capability allowlist to launch.

## Done when

- [ ] `apps/desktop/src-tauri/Cargo.toml` exists, mirroring qwery-core's deps verbatim: `tauri = "2"`, `tauri-plugin-shell = "2"`, `tauri-plugin-opener = "2"`, `tauri-plugin-os = "2"`, `tauri-plugin-dialog = "2"`, `keyring = "3"` with `linux-native` / `windows-native` / `apple-native` features, `serde = { version = "1", features = ["derive"] }`, `serde_json = "1"`, `dotenvy = "0.15"`. `tauri-build = "2"` under `[build-dependencies]`. `crate-type = ["staticlib", "cdylib", "rlib"]`, `lib.name = "desktop_lib"`.
- [ ] `apps/desktop/src-tauri/build.rs` calls `tauri_build::build()` (one-line shim).
- [ ] `apps/desktop/src-tauri/tauri.conf.json` has `productName: "Guepard Desktop"`, `identifier: "run.guepard.desktop"`, `version: "0.1.0"`, **no `frontendDist`** (the sidecar will inject `window.__GUEPARD_API_URL`), one window with sane defaults (1440×900, min 1024×720, dark background `#111827`).
- [ ] `apps/desktop/src-tauri/tauri.conf.json` `bundle.externalBin` is set up as a placeholder pointing at `binaries/api-server` (the actual binary is wired in story 002 — empty array is acceptable here if Tauri's schema requires it).
- [ ] `apps/desktop/src-tauri/capabilities/default.json` grants the minimum allowlist: shell-sidecar (template-only at this stage), opener, dialog, os. No shell-execute beyond what's listed.
- [ ] Placeholder icons under `apps/desktop/src-tauri/icons/` (32×32 PNG, 128×128 PNG, 128×128@2x, ICO, ICNS) — Tauri requires icons even for dev builds. Lift qwery-core's icons or use plain placeholders.
- [ ] `cd apps/desktop/src-tauri && cargo check` succeeds.
- [ ] `pnpm typecheck` stays green at the monorepo root.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`.
- Reference qwery-core's `apps/desktop/src-tauri/Cargo.toml` and `tauri.conf.json` directly — same dep set, mostly the same config minus a few qwery-specific values.
