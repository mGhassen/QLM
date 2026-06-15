'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StyleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function StyleSection({
  title,
  defaultOpen = true,
  children,
}: StyleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="wf-section">
      <button
        type="button"
        className="wf-section-header"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="wf-section-body">{children}</div>}
    </div>
  );
}
