---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/README.md
validation:
  kind: typecheck-only
---

# Smoke-launch Tauri window

Manually verify that the freshly scaffolded Tauri shell launches a window, writes the log file, and cleans up the PID file on quit. This task is the "build + UI check" gate for story 001 — its outcome is human-eyeballed during `/finish`.

## Done when

- [ ] `pnpm --filter desktop tauri:dev` builds and opens a Tauri window on the dev host (macOS / Linux / Windows — at least the host triple).
- [ ] First launch creates `<app_config_dir>/desktop.log` (e.g. `~/Library/Application Support/run.guepard.desktop/desktop.log` on macOS) with a `desktop: starting` line.
- [ ] No `panic`, no Rust assertion failure, no Tauri runtime error visible in the terminal during launch.
- [ ] Closing the window terminates the process cleanly (PID file removed if present).
- [ ] Relaunch within the same minute does not leave a zombie process (kill-previous works).
- [ ] `apps/desktop/README.md` (new file or appended) documents the dev-loop one-liner, the log file path per OS, and the PID file location.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop` + `#10-verification-plan`.
- The webview will load no real content yet — sidecar binary lands in story 002. An empty/error page in the window is expected and fine for this smoke check.
- Capture the log-file tail in the story's Demo / verification section when running `/finish`.
