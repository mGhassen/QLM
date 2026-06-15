"use client";

import { Keyboard } from "lucide-react";
import {
  EDITOR_SHORTCUTS,
  STUDIO_SHORTCUTS,
  formatShortcut,
} from "#/lib/studio-shortcuts";

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground/55">{label}</span>
      <kbd className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded border border-border/10 bg-muted text-muted-foreground/60">
        {formatShortcut(keys)}
      </kbd>
    </div>
  );
}

export default function KeyboardShortcutsPanel() {
  return (
    <details className="group border-t border-border/5 pt-4">
      <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] font-medium text-muted-foreground/45 uppercase tracking-wide select-none">
        <Keyboard size={13} className="text-muted-foreground/35" />
        <span className="flex-1">Keyboard shortcuts</span>
      </summary>
      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground/35 uppercase tracking-wide">Studio</div>
          {STUDIO_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground/35 uppercase tracking-wide">Text editor</div>
          {EDITOR_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
          ))}
        </div>
      </div>
    </details>
  );
}
