'use client';

import ColorPicker from './ColorPicker';
import type { DocTheme } from '#/lib/types';

export const THEME_PRESETS: { name: string; theme: DocTheme }[] = [
  {
    name: 'QLM',
    theme: {
      brand: '#ffcb51',
      ink: '#161616',
      surface: '#ffffff',
      bg: '#f2f2f2',
      eyebrow: '#6a9955',
    },
  },
  {
    name: 'Midnight',
    theme: {
      brand: '#6366f1',
      ink: '#f8fafc',
      surface: '#1e1e2e',
      bg: '#11111b',
      eyebrow: '#a6e3a1',
    },
  },
  {
    name: 'Forest',
    theme: {
      brand: '#2f7d4f',
      ink: '#1a2e1a',
      surface: '#f8faf5',
      bg: '#e8f0e8',
      eyebrow: '#4a7c59',
    },
  },
  {
    name: 'Slate',
    theme: {
      brand: '#64748b',
      ink: '#0f172a',
      surface: '#ffffff',
      bg: '#f1f5f9',
      eyebrow: '#475569',
    },
  },
];

interface ThemeSettingsProps {
  theme: DocTheme;
  onChange: (theme: DocTheme) => void;
  className?: string;
}

export default function ThemeSettings({
  theme,
  onChange,
  className,
}: ThemeSettingsProps) {
  return (
    <div className={className ?? 'space-y-4 p-4'}>
      <div>
        <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChange({ ...theme, ...p.theme })}
              className="border-border hover:bg-accent rounded-none border px-2.5 py-1 text-xs"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <ColorPicker
        label="Brand"
        value={theme.brand}
        onChange={(brand) => onChange({ ...theme, brand })}
      />
      <ColorPicker
        label="Ink (text)"
        value={theme.ink}
        onChange={(ink) => onChange({ ...theme, ink })}
      />
      <ColorPicker
        label="Surface"
        value={theme.surface}
        onChange={(surface) => onChange({ ...theme, surface })}
      />
      <ColorPicker
        label="Background"
        value={theme.bg}
        onChange={(bg) => onChange({ ...theme, bg })}
      />
      <ColorPicker
        label="Eyebrow"
        value={theme.eyebrow}
        onChange={(eyebrow) => onChange({ ...theme, eyebrow })}
      />
    </div>
  );
}
