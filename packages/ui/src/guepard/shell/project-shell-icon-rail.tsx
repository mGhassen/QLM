import type { ReactNode } from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { cn } from '../../lib/utils';
import { resolveIcon } from './icon-map';

export type IconRailItem = {
  id: string;
  label: string;
  /** Lucide icon name (e.g. "LayoutDashboard"). */
  icon: string;
  active?: boolean;
};

export type ProjectShellIconRailProps = {
  projectName: string;
  projectInitials: string;
  activeLabel?: string;
  items: IconRailItem[];
  onItemClick: (id: string) => void;
  onHeaderClick?: () => void;
  footer?: ReactNode;
};

function projectInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'P';
}

export function ProjectShellIconRail({
  projectName,
  projectInitials: initials,
  activeLabel,
  items,
  onItemClick,
  onHeaderClick,
  footer,
}: Readonly<ProjectShellIconRailProps>) {
  const displayInitials = initials || projectInitials(projectName);

  return (
    <div className="bg-sidebar border-sidebar-border flex h-full w-full flex-col overflow-hidden border-r">
      {/* Header: project name */}
      <div className="shrink-0 px-2 py-2">
        <button
          type="button"
          className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
          onClick={onHeaderClick}
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-black"
            style={{ backgroundColor: 'hsl(42 100% 66%)' }}
          >
            {displayInitials}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="text-sidebar-foreground truncate text-xs font-medium">
              {projectName}
            </span>
            {activeLabel && (
              <span className="text-sidebar-foreground/50 shrink-0 text-[10px]">
                {activeLabel}
              </span>
            )}
          </span>
          <ChevronsUpDown
            className="text-sidebar-foreground/45 h-3.5 w-3.5 shrink-0"
            aria-hidden
          />
        </button>
      </div>

      {/* Bucket items */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-1 py-2">
        {items.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                item.active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {footer && (
        <div className="border-sidebar-border shrink-0 border-t px-1 py-1">
          {footer}
        </div>
      )}
    </div>
  );
}

export { projectInitials };
