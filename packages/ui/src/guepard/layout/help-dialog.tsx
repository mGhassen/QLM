import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../shadcn/dialog';
import { cn } from '../../lib/utils';

export type HelpSection = {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
};

export type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: HelpSection[];
  defaultSectionId?: string;
  title?: string;
};

/**
 * Modal help dialog with a left-pane section list and right-pane content.
 * The `content` of each section is arbitrary JSX — consumers typically pass
 * a `<Shortcuts />` list, `<Kbd />` badges, or plain text.
 */
export function HelpDialog({
  open,
  onOpenChange,
  sections,
  defaultSectionId,
  title = 'Help',
}: Readonly<HelpDialogProps>) {
  const [activeId, setActiveId] = useState<string | undefined>(
    defaultSectionId ?? sections[0]?.id,
  );
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="border-border border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex h-[500px]">
          {/* Left: sections list */}
          <nav
            className="border-border w-56 shrink-0 overflow-y-auto border-r p-2"
            aria-label="Help sections"
          >
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: section content */}
          <div className="flex-1 overflow-y-auto p-5">{active?.content}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
