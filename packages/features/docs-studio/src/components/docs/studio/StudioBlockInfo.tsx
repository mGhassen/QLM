'use client';

import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { BLOCK_LABELS } from '#/lib/block-fields';
import type { BlockType } from '#/lib/types';

interface StudioBlockInfoProps {
  blockId: string;
  type: BlockType;
}

export default function StudioBlockInfo({
  blockId,
  type,
}: StudioBlockInfoProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = BLOCK_LABELS[type] ?? type;

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div
      ref={ref}
      className="studio-block-info"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="Block info"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Info size={12} />
      </button>

      {open && (
        <div className="studio-block-info-popover">
          <div className="studio-block-info-type">{label}</div>
          <div className="studio-block-info-id">{blockId}</div>
        </div>
      )}
    </div>
  );
}
