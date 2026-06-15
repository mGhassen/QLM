import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { renderIcon } from './icon-map';

export type SwitcherTabItem = {
  id: string;
  title: string;
  icon?: string;
  active?: boolean;
};

export type TabSwitcherOverlayProps = {
  /** Tabs in MRU order (index 0 = most recently used). */
  tabs: SwitcherTabItem[];
  /** Which tab is currently highlighted in the switcher (0-based). */
  selectedIndex: number;
  onClose: () => void;
  onConfirm: (tabId: string) => void;
  labels: {
    title: string;
    hint: string;
  };
};

export function TabSwitcherOverlay({
  tabs,
  selectedIndex,
  onClose,
  onConfirm,
  labels,
}: Readonly<TabSwitcherOverlayProps>) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Confirm on Ctrl keyup
  useEffect(() => {
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'Control' || e.key === 'Meta') {
        const tab = tabs[selectedIndex];
        if (tab) onConfirm(tab.id);
        else onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs, selectedIndex, onConfirm, onClose]);

  if (tabs.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="border-border bg-background flex max-h-[480px] w-[360px] flex-col border-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border bg-muted/20 flex items-center justify-between border-b-2 px-4 py-2">
          <span className="text-muted-foreground text-[10px] font-black tracking-[0.4em] uppercase">
            {labels.title}
          </span>
          <span className="text-muted-foreground/60 font-mono text-[10px]">
            {labels.hint}
          </span>
        </div>

        {/* Tab list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {tabs.map((tab, idx) => (
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
              {idx === 0 && (
                <span
                  className={cn(
                    'shrink-0 text-[9px] font-black tracking-widest uppercase',
                    idx === selectedIndex
                      ? 'text-background/60'
                      : 'text-muted-foreground/60',
                  )}
                >
                  CURRENT
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
