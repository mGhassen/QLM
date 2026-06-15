import { useState, type ReactNode } from 'react';
import { ChevronDown, LayoutGrid, Pin, Plus, ExternalLink } from 'lucide-react';

import { cn } from '../../lib/utils';
import { resolveIcon, renderIcon } from './icon-map';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';
import { useShellSidebar } from './project-shell-frame';

/** An action that can appear in the app item dropdown menu. */
export type SidebarAppAction = {
  id: string;
  label: string;
  /** Lucide icon name. */
  icon?: string;
};

/** A single app entry in the sidebar. */
export type SidebarAppItem = {
  id: string;
  label: string;
  /** Lucide icon name. */
  icon: string;
  active?: boolean;
  pinned?: boolean;
  /** Additional actions declared by the app, shown in the dropdown menu. */
  actions?: SidebarAppAction[];
};

/** A group of apps under a category heading (e.g. Ops, Data, AI). */
export type SidebarAppGroup = {
  title: string;
  items: SidebarAppItem[];
};

/** A pinned item shown above the Apps section (e.g. Dashboard). */
export type SidebarPinnedItem = {
  id: string;
  label: string;
  /** Lucide icon name. */
  icon: string;
  active?: boolean;
};

/** A pinned app shown between Dashboard and Apps. */
export type SidebarPinnedTab = {
  id: string;
  label: string;
  /** Lucide icon name. */
  icon?: string;
  active?: boolean;
  /** Additional actions shown in the app menu (+). */
  actions?: SidebarAppAction[];
};

export type ProjectShellSidebarProps = {
  /** Rendered at the very top of the sidebar (e.g. org dropdown). */
  header?: ReactNode;
  pinnedItems: SidebarPinnedItem[];
  /** Pinned apps — shown between Dashboard and Apps. */
  pinnedTabs?: SidebarPinnedTab[];
  appGroups: SidebarAppGroup[];
  /** Called when an app or pinned tab is clicked. */
  onItemClick: (id: string, newTab: boolean) => void;
  /** Called when Pin / Unpin is selected from the menu. */
  onPinItem?: (id: string) => void;
  /** Called when a custom app action is selected. */
  onAppAction?: (appId: string, actionId: string) => void;
  /** Whether the Apps section starts expanded. */
  defaultAppsOpen?: boolean;
  /** Rendered at the bottom of the sidebar (e.g. user profile menu). */
  footer?: ReactNode;
};

// ---------------------------------------------------------------------------
// Icon-only button with tooltip (used in collapsed mode)
// ---------------------------------------------------------------------------

function IconButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const iconEl = renderIcon(icon, { className: 'h-4 w-4' });
  if (!iconEl) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
          >
            {iconEl}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// App item menu (expanded mode only)
// ---------------------------------------------------------------------------

function AppItemMenu({
  item,
  onOpenInNewTab,
  onPin,
  onAppAction,
}: {
  item: SidebarAppItem;
  onOpenInNewTab: () => void;
  onPin?: () => void;
  onAppAction?: (actionId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-opacity',
            open
              ? 'opacity-100'
              : 'opacity-0 group-hover/item:opacity-50 group-hover/item:hover:opacity-100',
          )}
          aria-label={`Actions for ${item.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={4}>
        <DropdownMenuItem onClick={onOpenInNewTab}>
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Open in new tab
        </DropdownMenuItem>

        {onPin && (
          <DropdownMenuItem onClick={onPin}>
            <Pin
              className={cn('mr-2 h-3.5 w-3.5', item.pinned && 'rotate-45')}
            />
            {item.pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
        )}

        {item.actions && item.actions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {item.actions.map((action) => {
              const ActionIcon = action.icon ? resolveIcon(action.icon) : null;
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => onAppAction?.(action.id)}
                >
                  {ActionIcon && <ActionIcon className="mr-2 h-3.5 w-3.5" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function ProjectShellSidebar({
  header,
  pinnedItems,
  pinnedTabs = [],
  appGroups,
  onItemClick,
  onPinItem,
  onAppAction,
  defaultAppsOpen = true,
  footer,
}: Readonly<ProjectShellSidebarProps>) {
  const [appsOpen, setAppsOpen] = useState(defaultAppsOpen);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const { collapsed } = useShellSidebar();
  const hasAppGroups = appGroups.some((group) => group.items.length > 0);

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // ── Collapsed: icon-only sidebar ──────────────────────────────────────
  if (collapsed) {
    return (
      <div className="bg-sidebar border-sidebar-border flex h-full w-full flex-col items-center overflow-hidden border-r">
        {/* Header (org avatar) */}
        {header && (
          <div className="border-sidebar-border flex h-[38px] w-full shrink-0 items-center justify-center border-b px-1">
            {header}
          </div>
        )}

        {/* Pinned items (e.g. Dashboard) */}
        <div className="shrink-0 space-y-1 py-2">
          {pinnedItems.map((item) => (
            <IconButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={(e) => onItemClick(item.id, e.metaKey || e.ctrlKey)}
            />
          ))}
        </div>

        {/* Pinned tabs */}
        {pinnedTabs.length > 0 && (
          <div className="shrink-0 space-y-1 pb-2">
            {pinnedTabs.map((tab) => (
              <IconButton
                key={tab.id}
                icon={tab.icon ?? 'Package'}
                label={tab.label}
                active={tab.active}
                onClick={(e) => onItemClick(tab.id, e.metaKey || e.ctrlKey)}
              />
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1" />

        {/* Footer (profile avatar) */}
        {footer && (
          <div className="border-sidebar-border mt-auto shrink-0 border-t px-1 py-1">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // ── Expanded: full sidebar ────────────────────────────────────────────
  return (
    <div className="bg-sidebar border-sidebar-border flex h-full w-full flex-col overflow-hidden border-r">
      {/* Header (e.g. org dropdown) */}
      {header && (
        <div className="border-sidebar-border flex h-[38px] shrink-0 items-center border-b px-2">
          {header}
        </div>
      )}

      {/* Pinned items (e.g. Dashboard) */}
      <div className="shrink-0 px-2 pt-2 pb-3">
        {pinnedItems.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => onItemClick(item.id, e.metaKey || e.ctrlKey)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                item.active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent',
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pinned apps */}
      {pinnedTabs.length > 0 && (
        <div className="shrink-0 px-2 pb-3">
          <div className="border-sidebar-border/60 mb-2 border-t" />
          <div className="space-y-0.5">
            {pinnedTabs.map((tab) => {
              const Icon = tab.icon ? resolveIcon(tab.icon) : null;
              const menuItem: SidebarAppItem = {
                id: tab.id,
                label: tab.label,
                icon: tab.icon ?? 'Package',
                active: tab.active,
                actions: tab.actions,
              };
              return (
                <div
                  key={tab.id}
                  className={cn(
                    'group/item flex w-full items-center rounded-md transition-colors',
                    tab.active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => onItemClick(tab.id, e.metaKey || e.ctrlKey)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-xs font-medium"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{tab.label}</span>
                  </button>
                  {tab.actions?.length === 1 && onAppAction ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppAction(tab.id, tab.actions![0]!.id);
                      }}
                      className={cn(
                        'mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity',
                        'group-hover/item:opacity-50 group-hover/item:hover:opacity-100',
                      )}
                      aria-label={tab.actions[0]!.label}
                      title={tab.actions[0]!.label}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ) : (tab.actions?.length ?? 0) > 0 ? (
                    <AppItemMenu
                      item={menuItem}
                      onOpenInNewTab={() => onItemClick(tab.id, true)}
                      onAppAction={
                        onAppAction
                          ? (actionId) => onAppAction(tab.id, actionId)
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasAppGroups ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2">
        {/* Apps header (collapsible) */}
        <button
          type="button"
          onClick={() => setAppsOpen((prev) => !prev)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold tracking-wide uppercase transition-colors"
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Apps</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform',
              appsOpen && 'rotate-180',
            )}
          />
        </button>

        {/* App groups */}
        {appsOpen && (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {appGroups.map((group) => {
              if (group.items.length === 0) return null;
              const isGroupCollapsed = collapsedGroups.has(group.title);
              return (
                <div key={group.title} className="mt-4 first:mt-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className="group/group-header text-sidebar-foreground/70 hover:text-sidebar-foreground mb-1.5 flex w-full items-center gap-1.5 px-2 transition-colors"
                  >
                    <span className="flex-1 text-left text-[12px] font-bold tracking-tight">
                      {group.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 shrink-0 opacity-0 transition-all group-hover/group-header:opacity-60',
                        isGroupCollapsed && '-rotate-90 opacity-40',
                      )}
                    />
                  </button>
                  {!isGroupCollapsed && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = resolveIcon(item.icon);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'group/item flex w-full items-center rounded-md transition-colors',
                              item.active
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                            )}
                          >
                            <button
                              type="button"
                              onClick={(e) =>
                                onItemClick(item.id, e.metaKey || e.ctrlKey)
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm font-medium"
                            >
                              {Icon && <Icon className="h-4 w-4 shrink-0" />}
                              <span className="truncate">{item.label}</span>
                            </button>
                            <AppItemMenu
                              item={item}
                              onOpenInNewTab={() => onItemClick(item.id, true)}
                              onPin={
                                onPinItem ? () => onPinItem(item.id) : undefined
                              }
                              onAppAction={
                                onAppAction
                                  ? (actionId) => onAppAction(item.id, actionId)
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {/* Footer */}
      {footer && (
        <div className="border-sidebar-border shrink-0 border-t px-1 py-1">
          {footer}
        </div>
      )}
    </div>
  );
}
