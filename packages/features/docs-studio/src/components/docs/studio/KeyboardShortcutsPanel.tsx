'use client';

import { Keyboard } from 'lucide-react';
import {
  EDITOR_SHORTCUTS,
  STUDIO_SHORTCUTS,
  formatShortcut,
} from '#/lib/studio-shortcuts';

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground/55">{label}</span>
      <kbd className="border-border/10 bg-muted text-muted-foreground/60 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]">
        {formatShortcut(keys)}
      </kbd>
    </div>
  );
}

export default function KeyboardShortcutsPanel() {
  return (
    <details className="group border-border/5 border-t pt-4">
      <summary className="text-muted-foreground/45 flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium tracking-wide uppercase select-none">
        <Keyboard size={13} className="text-muted-foreground/35" />
        <span className="flex-1">Keyboard shortcuts</span>
      </summary>
      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <div className="text-muted-foreground/35 text-[10px] font-medium tracking-wide uppercase">
            Studio
          </div>
          {STUDIO_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-muted-foreground/35 text-[10px] font-medium tracking-wide uppercase">
            Text editor
          </div>
          {EDITOR_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
          ))}
        </div>
      </div>
    </details>
  );
}
