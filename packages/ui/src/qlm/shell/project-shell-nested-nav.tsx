import { cn } from '../../lib/utils';

export type NestedNavItem = {
  id: string;
  label: string;
  active?: boolean;
};

export type NestedNavGroup = {
  title: string;
  items: NestedNavItem[];
};

export type ProjectShellNestedNavProps = {
  bucketLabel: string;
  groups: NestedNavGroup[];
  onItemClick: (itemId: string) => void;
};

export function ProjectShellNestedNav({
  bucketLabel,
  groups,
  onItemClick,
}: Readonly<ProjectShellNestedNavProps>) {
  return (
    <div className="bg-sidebar border-sidebar-border flex h-full w-[15rem] shrink-0 flex-col overflow-hidden border-r">
      {/* Header */}
      <div className="border-sidebar-border shrink-0 border-b px-2 py-2">
        <div className="flex w-full items-center rounded-md px-2 py-1.5">
          <h2 className="text-sidebar-foreground min-w-0 flex-1 truncate text-xs font-semibold tracking-tight">
            {bucketLabel}
          </h2>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 space-y-3 overflow-y-auto px-2 py-2">
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.title}>
              <p className="text-sidebar-foreground/40 mb-1 px-2 text-[10px] font-medium tracking-[0.12em] uppercase">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick(item.id)}
                    className={cn(
                      'flex w-full items-center rounded-md px-2 py-1.5 text-xs leading-snug transition-colors',
                      item.active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
