'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Plus, Sparkles } from 'lucide-react';

import { Button } from '@guepard/ui/button';
import { cn } from '@guepard/ui/utils';

interface CellDividerProps {
  onAddCell: (type: 'query' | 'text' | 'prompt') => void;
  className?: string;
}

export function CellDivider({ onAddCell, className }: CellDividerProps) {
  const { t } = useTranslation('notebooks');

  return (
    <div
      className={cn(
        'group relative my-2 flex h-6 w-full items-center justify-center transition-all duration-300',
        className,
      )}
    >
      <div className="via-border absolute inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent transition-all duration-300 group-hover:via-transparent" />

      {/* Baseline: always-visible subtle + marker. Hidden on hover so the typed
          buttons can take the center stage. */}
      <div className="bg-background text-muted-foreground/70 group-hover:text-muted-foreground relative z-10 flex h-5 w-5 items-center justify-center rounded-full border opacity-60 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0">
        <Plus className="h-3 w-3" aria-hidden />
        <span className="sr-only">
          {t('divider.add', { defaultValue: 'Add cell' })}
        </span>
      </div>

      {/* Hover: the 3 typed buttons fan out in place of the baseline marker. */}
      <div className="absolute inset-x-0 z-20 flex translate-y-1 transform items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('query')}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('divider.addCode', { defaultValue: 'Code' })}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('text')}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('divider.addMarkdown', { defaultValue: 'Markdown' })}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('prompt')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t('divider.addPrompt', { defaultValue: 'Prompt' })}
        </Button>
      </div>
    </div>
  );
}
