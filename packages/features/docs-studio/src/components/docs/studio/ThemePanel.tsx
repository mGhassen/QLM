'use client';

import { useState } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import type { DocTheme } from '#/lib/types';
import ThemeSettings from './ThemeSettings';

export { THEME_PRESETS } from './ThemeSettings';

interface ThemePanelProps {
  theme: DocTheme;
  onChange: (theme: DocTheme) => void;
}

export default function ThemePanel({ theme, onChange }: ThemePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border hover:bg-accent flex items-center gap-1 rounded-none border px-3 py-1.5 text-xs"
      >
        <Palette size={14} />
        Theme
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="bg-popover border-border absolute top-full right-0 z-50 mt-1 max-h-[70vh] w-72 overflow-y-auto rounded-none border shadow-xl">
          <ThemeSettings theme={theme} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
