'use client';

import { useEffect, useRef, useState } from 'react';
import { createBlock } from '#/lib/serialize';
import { LAYOUT_PRESETS } from '#/lib/layout-presets';
import {
  SLASH_INSERT_CATEGORIES,
  type PaletteCategory,
  type PaletteItem,
} from '#/lib/palette';
import type { BlockNode } from '#/lib/types';

interface SlashInsertMenuProps {
  open: boolean;
  query: string;
  anchorRect: DOMRect | null;
  onInsert: (block: BlockNode) => void;
  onClose: () => void;
  categories?: PaletteCategory[];
}

interface SlashItem {
  key: string;
  label: string;
  create: () => BlockNode;
}

function matchesQuery(label: string, query: string): boolean {
  if (!query) return true;
  return label.toLowerCase().includes(query.toLowerCase());
}

function paletteToSlashItem(item: PaletteItem): SlashItem {
  return {
    key: `${item.type}-${item.label}`,
    label: item.label,
    create: () => createBlock(item.type, item.overrides),
  };
}

function buildSlashItems(categories: PaletteCategory[]): SlashItem[] {
  const textAndDesign = categories.flatMap((cat) =>
    cat.items.map(paletteToSlashItem),
  );
  const presets: SlashItem[] = LAYOUT_PRESETS.filter(
    (p) => !['hero', 'cover', 'section'].includes(p.id),
  ).map((p) => ({
    key: `preset-${p.id}`,
    label: p.label,
    create: () => p.create(),
  }));
  return [...textAndDesign, ...presets];
}

export default function SlashInsertMenu({
  open,
  query,
  anchorRect,
  onInsert,
  onClose,
  categories = SLASH_INSERT_CATEGORIES,
}: SlashInsertMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = buildSlashItems(categories).filter((item) =>
    matchesQuery(item.label, query),
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        onInsert(filtered[activeIndex].create());
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onInsert, onClose]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    zIndex: 300,
  };

  return (
    <div ref={ref} className="studio-slash-menu" style={style}>
      <div className="studio-slash-menu-header">
        {query ? `Search: ${query}` : 'Insert block — type to filter'}
      </div>
      {filtered.length === 0 ? (
        <div className="studio-slash-menu-empty">No matches</div>
      ) : (
        <div className="studio-slash-menu-list">
          {filtered.slice(0, 12).map((item, i) => (
            <button
              key={item.key}
              type="button"
              className={`studio-slash-menu-item${i === activeIndex ? ' active' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                onInsert(item.create());
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
