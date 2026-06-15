---
story: ./story.md
status: done
layer: docs
model: haiku
files:
  - .github/workflows/desktop-ci.yml
validation:
  kind: typecheck-only
---

# Add CI matrix workflow

Per spec §10.3: cross-platform CI matrix for the desktop shell. New workflow runs Rust static checks + sidecar build + `cargo build --release` on macOS, Linux, and Windows.

## Done when

- [ ] `.github/workflows/desktop-ci.yml` (new) with:
  - Trigger: `pull_request` + `push` on `main` limited to `apps/desktop/**`, `apps/server/**`, `packages/**`, `.github/workflows/desktop-ci.yml` paths.
  - Jobs matrix: `{ os: [macos-latest, ubuntu-latest, windows-latest] }`.
  - `windows-latest` job has `continue-on-error: true` (runner may be unavailable in this account — log the miss rather than block the PR; revisit once a Windows runner is provisioned).
  - Steps per job:
    1. `actions/checkout@v4`
    2. `oven-sh/setup-bun@v2` (for sidecar build)
    3. `actions/setup-node@v4` with `package-json-strategy` matching repo root (`.nvmrc` / `package.json#engines.node`)
    4. `pnpm/action-setup@v4` (version from `package.json#packageManager`)
    5. `dtolnay/rust-toolchain@stable` with `components: clippy, rustfmt`
    6. Platform-specific native deps: Linux → `sudo apt-get install -y libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` per Tauri 2 docs.
    7. `pnpm install --frozen-lockfile`
    8. `pnpm --filter server build:desktop`
    9. `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --release -- -D warnings`
    10. `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check`
    11. `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
    12. `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --release`
  - Concurrency: `concurrency: { group: desktop-ci-${{ github.ref }}, cancel-in-progress: true }`.
- [ ] Workflow file validates against GitHub's schema (paste lint the YAML; no syntax errors).
- [ ] `pnpm typecheck` green (no TS impact, just a safety net).

## Notes

- Don't attempt to cross-compile the sidecar to all 5 target triples — that's release-engineering work. Each runner builds only its own triple.
- The `continue-on-error` on Windows is a deliberate leniency until the runner is provisioned. Log it as a Question on story.md.
- Spec anchor: `#103-integration-tests` (cross-platform matrix bullet).
