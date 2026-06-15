import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { renderIcon } from './icon-map';
import type { SwitcherTabItem } from './tab-switcher-overlay';

export type QuickTabSwitcherProps = {
  tabs: SwitcherTabItem[];
  onClose: () => void;
  onConfirm: (tabId: string) => void;
  labels: {
    placeholder: string;
    noResults: string;
    title: string;
  };
};

export function QuickTabSwitcher({
  tabs,
  onClose,
  onConfirm,
  labels,
}: Readonly<QuickTabSwitcherProps>) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  const filtered = query.trim()
    ? tabs.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    : tabs;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset highlight to top when filter query changes.
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const tab = filtered[selectedIndex];
        if (tab) onConfirm(tab.id);
        return;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onClose, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="border-border bg-background flex max-h-[480px] w-[480px] flex-col border-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border bg-muted/20 border-b-2 px-4 py-2">
          <span className="text-muted-foreground text-[10px] font-black tracking-[0.4em] uppercase">
            {labels.title}
          </span>
        </div>

        {/* Search input */}
        <div className="border-border border-b px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.placeholder}
            className="text-foreground placeholder:text-muted-foreground/50 w-full bg-transparent text-sm font-semibold outline-none"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* Results */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {filtered.length === 0 ? (
            <div className="text-muted-foreground/50 px-4 py-6 text-center text-xs font-black tracking-widest uppercase">
              {labels.noResults}
            </div>
          ) : (
            filtered.map((tab, idx) => (
              <button
                key={tab.id}
                ref={idx === selectedIndex ? selectedRef : undefined}
                type="button"
                onClick={() => onConfirm(tab.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  idx === selectedIndex
                    ? 'bg-foreground text-background'
                    : 'hover:bg-muted/60 text-foreground',
                )}
              >
                {tab.icon && (
                  <span className="shrink-0">
                    {renderIcon(tab.icon, { className: 'h-4 w-4' })}
                  </span>
                )}
                <span className="flex-1 truncate text-sm font-semibold">
                  {tab.title}
                </span>
                {tab.active && (
                  <span
                    className={cn(
                      'shrink-0 text-[9px] font-black tracking-widest uppercase',
                      idx === selectedIndex
                        ? 'text-background/60'
                        : 'text-muted-foreground/60',
                    )}
                  >
                    ACTIVE
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
