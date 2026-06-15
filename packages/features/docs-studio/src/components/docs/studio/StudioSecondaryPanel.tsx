"use client";

import type { ReactNode } from "react";

interface StudioSecondaryPanelProps {
  title: string;
  children: ReactNode;
}

export default function StudioSecondaryPanel({ title, children }: StudioSecondaryPanelProps) {
  return (
    <aside
      data-studio-chrome
      className="studio-secondary-panel bg-sidebar border-sidebar-border flex w-[15rem] min-h-0 shrink-0 flex-col border-r"
    >
      <div className="border-sidebar-border shrink-0 border-b px-2 py-2">
        <h2 className="text-sidebar-foreground/50 px-2 text-[10px] font-medium tracking-[0.12em] uppercase">
          {title}
        </h2>
      </div>
      <div data-tree-scroll className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {children}
      </div>
    </aside>
  );
}
