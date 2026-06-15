import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Pin,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  History,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '../../lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../shadcn/context-menu';
import { Popover, PopoverAnchor, PopoverContent } from '../../shadcn/popover';
import { Button } from '../../shadcn/button';
import { ShellSidebarTrigger } from './project-shell-frame';
import { renderIcon } from './icon-map';

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan';

export type TabGroupDef = {
  id: string;
  title: string;
  color: TabGroupColor;
  collapsed: boolean;
  tabCount: number;
};

export type TabGroupLabels = {
  addToGroup: string;
  newGroup: string;
  removeFromGroup: string;
  moveToGroup: string;
  ungroupAll: string;
  rename: string;
  collapse: string;
  expand: string;
  closeGroup: string;
  pinGroup: string;
  unnamedGroup: string;
  selectedTabs: string;
  groupSelected: string;
};

export type TabItem = {
  id: string;
  title: string;
  active?: boolean;
  pinned?: boolean;
  /** Lucide icon name from the app manifest. */
  icon?: string;
  groupId?: string;
  groupColor?: TabGroupColor;
  groupCollapsed?: boolean;
  /** True for the first tab in its group (group pill renders before this tab). */
  isGroupLeader?: boolean;
  /** True when the tab is ephemeral (VS Code preview semantics). Title renders italic. */
  preview?: boolean;
  /** True when the tab has unsaved changes. Renders an amber dot. */
  dirty?: boolean;
};

export type ProjectShellTabBarProps = {
  tabs: TabItem[];
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabPin?: (id: string) => void;
  onTabReorder?: (activeId: string, overId: string) => void;
  onNewTab?: () => void;
  onReloadTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onCloseToLeft?: (id: string) => void;
  hasClosedTabs?: boolean;
  onReopenClosedTab?: () => void;
  /** Rendered on the right side of the tab bar (e.g. documentation/AI buttons). */
  trailing?: ReactNode;
  /** Rendered on the left side of the tab bar (e.g. org menu when sidebar is hidden). */
  leading?: ReactNode;
  /** When false, the sidebar toggle button is omitted. */
  showSidebarTrigger?: boolean;
  // Tab groups
  tabGroups?: TabGroupDef[];
  groupLabels?: TabGroupLabels;
  onCreateGroup?: (
    tabIds: string[],
    title?: string,
    color?: TabGroupColor,
  ) => string;
  onRenameGroup?: (groupId: string, title: string) => void;
  onSetGroupColor?: (groupId: string, color: TabGroupColor) => void;
  onCollapseGroup?: (groupId: string, collapsed: boolean) => void;
  onUngroupAll?: (groupId: string) => void;
  onAddToGroup?: (tabId: string, groupId: string) => void;
  onRemoveFromGroup?: (tabId: string) => void;
  onReorderGroup?: (groupId: string, overId: string) => void;
  onCloseGroup?: (groupId: string) => void;
  onCloseGroupPreservePinned?: (groupId: string) => void;
  onPinGroup?: (groupId: string) => void;
  onCreateGroupFromSelection?: (tabIds: string[]) => void;
  // Global bar actions
  onCloseAllTabs?: () => void;
  onPinAllTabs?: () => void;
  onUnpinAllTabs?: () => void;
};

// ---------------------------------------------------------------------------
// Group color constant
// ---------------------------------------------------------------------------

const TAB_GROUP_COLOR_MAP: Record<TabGroupColor, string> = {
  grey: 'hsl(var(--tab-group-grey))',
  blue: 'hsl(var(--tab-group-blue))',
  red: 'hsl(var(--tab-group-red))',
  yellow: 'hsl(var(--tab-group-yellow))',
  green: 'hsl(var(--tab-group-green))',
  pink: 'hsl(var(--tab-group-pink))',
  purple: 'hsl(var(--tab-group-purple))',
  cyan: 'hsl(var(--tab-group-cyan))',
};

const ALL_GROUP_COLORS: TabGroupColor[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
];

// ---------------------------------------------------------------------------
// TabGroupPill
// ---------------------------------------------------------------------------

function TabGroupPill({
  group,
  hasPinnedTabs,
  onCollapseGroup,
  onSetGroupColor,
  onUngroupAll,
  onCloseGroup,
  onCloseGroupPreservePinned,
  onPinGroup,
  onRenameGroup,
  labels,
  flipRef,
}: {
  group: TabGroupDef;
  hasPinnedTabs?: boolean;
  onCollapseGroup?: (groupId: string, collapsed: boolean) => void;
  onSetGroupColor?: (groupId: string, color: TabGroupColor) => void;
  onUngroupAll?: (groupId: string) => void;
  onCloseGroup?: (groupId: string) => void;
  onCloseGroupPreservePinned?: (groupId: string) => void;
  onPinGroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, title: string) => void;
  labels?: TabGroupLabels;
  flipRef?: (el: HTMLDivElement | null) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(group.title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    setNodeRef: setSortableRef,
    isOver,
    isDragging,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({
    id: `group:${group.id}`,
    data: { type: 'group', groupId: group.id },
  });

  const colorBar = TAB_GROUP_COLOR_MAP[group.color];
  const colorTint = `hsl(var(--tab-group-${group.color}) / ${isOver ? '0.22' : '0.10'})`;
  const displayTitle = group.title || (labels?.unnamedGroup ?? 'Unnamed group');

  function commitRename() {
    const trimmed = renameValue.trim();
    onRenameGroup?.(group.id, trimmed);
    setRenameOpen(false);
  }

  return (
    <div
      ref={(el) => {
        flipRef?.(el);
        setSortableRef(el);
      }}
      className="relative inline-flex"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      {/* Rename popover */}
      <Popover open={renameOpen} onOpenChange={setRenameOpen}>
        <PopoverAnchor asChild>
          <div className="pointer-events-none absolute inset-0" />
        </PopoverAnchor>
        <PopoverContent
          className="border-border bg-background w-56 rounded-none border p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="border-border bg-muted/20 border-b-2 px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-bold">
              {labels?.rename ?? 'Rename group'}
            </p>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value.slice(0, 32))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenameOpen(false);
              }}
              maxLength={32}
              className="border-border bg-muted/40 focus:border-foreground h-8 w-full rounded-none border px-2 text-xs font-semibold outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 cursor-pointer rounded-none border text-xs font-semibold"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 flex-1 cursor-pointer rounded-none text-xs font-semibold"
                onClick={commitRename}
              >
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete confirm popover */}
      <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
        <PopoverAnchor asChild>
          <div className="pointer-events-none absolute inset-0" />
        </PopoverAnchor>
        <PopoverContent
          className="border-destructive/50 bg-background w-64 rounded-none border p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="border-destructive/50 bg-destructive/10 border-b-2 px-3 py-2">
            <p className="text-destructive text-[10px] font-bold">
              {labels?.closeGroup ?? 'Close group'}?
            </p>
          </div>
          <div className="flex flex-col gap-3 p-3">
            {hasPinnedTabs ? (
              <>
                <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
                  This group has pinned tabs. Choose how to handle them.
                </p>
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full cursor-pointer rounded-none border text-xs font-black tracking-widest uppercase"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full cursor-pointer rounded-none border text-xs font-semibold"
                    onClick={() => {
                      onCloseGroupPreservePinned?.(group.id);
                      setDeleteOpen(false);
                    }}
                  >
                    Preserve pinned — close unpinned only
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-full cursor-pointer rounded-none text-xs font-black tracking-widest uppercase"
                    onClick={() => {
                      onCloseGroup?.(group.id);
                      setDeleteOpen(false);
                    }}
                  >
                    Unpin &amp; close all
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
                  All tabs in this group will be closed.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 cursor-pointer rounded-none border text-xs font-black tracking-widest uppercase"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 flex-1 cursor-pointer rounded-none text-xs font-black tracking-widest uppercase"
                    onClick={() => {
                      onCloseGroup?.(group.id);
                      setDeleteOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => onCollapseGroup?.(group.id, !group.collapsed)}
            className={cn(
              'group/pill relative flex h-[38px] shrink-0 cursor-grab items-center gap-1.5 border px-2 select-none',
              // Expanded: no right border (leader tab's left border closes the gap)
              // Collapsed: right border closes the box since no tabs follow
              group.collapsed ? 'border-r' : 'border-r-0',
              'transition-opacity hover:opacity-80',
              isDragging && 'cursor-grabbing',
            )}
            style={{ borderColor: colorBar, backgroundColor: colorTint }}
            aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} group ${displayTitle}`}
            title={displayTitle}
            {...attributes}
            {...listeners}
          >
            <span
              className="max-w-[96px] truncate text-[11px] font-black"
              style={{ color: colorBar }}
            >
              {displayTitle}
              {group.collapsed && (
                <span className="ml-1 font-mono text-[8px]">
                  ×{group.tabCount}
                </span>
              )}
            </span>
            <ChevronRight
              className={cn(
                'h-3 w-3 shrink-0 transition-transform duration-150',
                !group.collapsed && 'rotate-90',
              )}
              style={{ color: colorBar }}
            />
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent className="min-w-[200px] rounded-none border p-0">
          {/* Color picker */}
          <div className="px-3 py-2">
            <ContextMenuLabel className="text-muted-foreground/70 mb-2 px-0 py-1 text-[11px] font-black tracking-widest uppercase">
              Color
            </ContextMenuLabel>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSetGroupColor?.(group.id, c)}
                  className={cn(
                    'h-4 w-4 cursor-pointer border transition-all',
                    group.color === c
                      ? 'border-foreground scale-110'
                      : 'hover:border-foreground/50 border-transparent',
                  )}
                  style={{ backgroundColor: TAB_GROUP_COLOR_MAP[c] }}
                  aria-label={c}
                  title={c}
                />
              ))}
            </div>
          </div>

          <ContextMenuSeparator className="my-0" />
          <div className="px-1 py-1">
            <ContextMenuItem
              onClick={() => {
                setRenameValue(group.title);
                setRenameOpen(true);
              }}
              className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
            >
              {labels?.rename ?? 'Rename group'}
            </ContextMenuItem>
            {onCollapseGroup && (
              <ContextMenuItem
                onClick={() => onCollapseGroup(group.id, !group.collapsed)}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
              >
                {group.collapsed
                  ? (labels?.expand ?? 'Expand group')
                  : (labels?.collapse ?? 'Collapse group')}
              </ContextMenuItem>
            )}
            {onUngroupAll && (
              <ContextMenuItem
                onClick={() => onUngroupAll(group.id)}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
              >
                {labels?.ungroupAll ?? 'Ungroup all'}
              </ContextMenuItem>
            )}
            {onPinGroup && (
              <ContextMenuItem
                onClick={() => onPinGroup(group.id)}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-[10px] font-black tracking-widest uppercase"
              >
                {labels?.pinGroup ?? 'Pin group'}
              </ContextMenuItem>
            )}
          </div>

          {onCloseGroup && (
            <>
              <ContextMenuSeparator className="my-0" />
              <div className="px-1 py-1">
                <ContextMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                >
                  <X className="h-3 w-3 shrink-0" />
                  {labels?.closeGroup ?? 'Close group'}
                </ContextMenuItem>
              </div>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable tab item
// ---------------------------------------------------------------------------

function SortableTabBarItem({
  tab,
  onSwitch,
  onClose,
  onPin,
  onMoveLeft,
  onMoveRight,
  onReload,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  closable,
  canMoveLeft,
  canMoveRight,
  hasTabsToCloseLeft,
  hasTabsToCloseRight,
  hasOtherCloseable,
  tabRef,
  flipRef,
  isSelected,
  isGroupLastTab,
  onShiftSelect,
  onSelectionToggle,
  onKeyDown,
  groups,
  groupLabels,
  onAddToGroup,
  onRemoveFromGroup,
  onUngroupAll,
  onCreateNewGroup,
}: {
  tab: TabItem;
  onSwitch: (e: React.MouseEvent) => void;
  onClose: () => void;
  onPin?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onReload?: () => void;
  onCloseOthers?: () => void;
  onCloseToRight?: () => void;
  onCloseToLeft?: () => void;
  closable: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  hasTabsToCloseLeft: boolean;
  hasTabsToCloseRight: boolean;
  hasOtherCloseable: boolean;
  tabRef?: React.Ref<HTMLButtonElement>;
  flipRef?: (el: HTMLDivElement | null) => void;
  isSelected?: boolean;
  isGroupLastTab?: boolean;
  onShiftSelect?: () => void;
  onSelectionToggle?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  groups?: TabGroupDef[];
  groupLabels?: TabGroupLabels;
  onAddToGroup?: (tabId: string, groupId: string) => void;
  onRemoveFromGroup?: (tabId: string) => void;
  onUngroupAll?: (groupId: string) => void;
  onCreateNewGroup?: (tabId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showClose = closable && !tab.pinned && (tab.active || hovered);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, data: { type: 'tab', groupId: tab.groupId } });

  const hasCloseGroupItems =
    (!!onCloseOthers && hasOtherCloseable) ||
    (hasTabsToCloseLeft && !!onCloseToLeft) ||
    (hasTabsToCloseRight && !!onCloseToRight);

  const otherGroups = (groups ?? []).filter((g) => g.id !== tab.groupId);
  const hasGroupSection = !tab.pinned;

  const groupColor = tab.groupColor
    ? TAB_GROUP_COLOR_MAP[tab.groupColor]
    : undefined;

  return (
    <div ref={flipRef}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            style={{
              transform: CSS.Transform.toString(transform),
              transition,
              zIndex: isDragging ? 10 : undefined,
              opacity: isDragging ? 0.5 : undefined,
            }}
            className="relative"
          >
            <button
              ref={(node) => {
                if (typeof tabRef === 'function') tabRef(node);
                else if (tabRef && 'current' in tabRef) {
                  Reflect.set(tabRef, 'current', node);
                }
                setActivatorNodeRef(node);
              }}
              id={`tab-${tab.id}`}
              type="button"
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  onSelectionToggle?.();
                  return;
                }
                if (e.shiftKey && onShiftSelect) {
                  e.preventDefault();
                  onShiftSelect();
                } else {
                  onSwitch(e);
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                onPin?.();
              }}
              onKeyDown={onKeyDown}
              onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault();
              }}
              onAuxClick={(e) => {
                if (e.button !== 1 || !closable || tab.pinned) return;
                e.preventDefault();
                onClose();
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className={cn(
                'group relative flex h-[38px] shrink-0 items-center gap-2 overflow-hidden border-b transition-colors select-none',
                tab.pinned && 'px-3',
                tab.groupColor
                  ? [
                      // Top border: group color frames the box from above
                      'border-t',
                      // Always show right border — grey between siblings, group color on last (via inline style)
                      'border-r',
                      // Left border: only group leader; non-leaders use left-neighbor's right border as divider
                      tab.isGroupLeader ? 'border-l' : 'border-l-0',
                    ]
                  : 'border-r-border dark:border-r-border border-r',
                tab.active
                  ? 'bg-card text-foreground border-b-transparent'
                  : 'text-muted-foreground hover:text-foreground/70',
                !tab.groupColor &&
                  !tab.active &&
                  'hover:bg-primary/10 dark:hover:bg-muted/50',
                isSelected && !tab.active && 'bg-primary/10',
                !tab.active &&
                  !tab.groupColor &&
                  'border-b-border dark:border-b-border',
              )}
              style={
                tab.groupColor
                  ? {
                      borderTopColor: groupColor,
                      borderBottomColor: tab.active
                        ? 'transparent'
                        : groupColor,
                      ...(tab.isGroupLeader && { borderLeftColor: groupColor }),
                      // Last tab closes the box with group color; others keep theme grey
                      ...(isGroupLastTab
                        ? { borderRightColor: groupColor }
                        : undefined),
                      backgroundColor: `hsl(var(--tab-group-${tab.groupColor}) / ${tab.active ? '0.15' : isSelected ? '0.14' : '0.08'})`,
                    }
                  : undefined
              }
              title={tab.title}
              {...attributes}
              {...listeners}
              role="tab"
              aria-selected={tab.active}
            >
              {tab.active && (
                <div
                  className="pointer-events-none absolute right-0 -bottom-px left-0 h-[2px]"
                  style={{ backgroundColor: 'hsl(42 100% 66%)' }}
                />
              )}
              {tab.pinned ? (
                tab.icon ? (
                  renderIcon(tab.icon, { className: 'h-3.5 w-3.5' })
                ) : (
                  <Pin className="h-3.5 w-3.5 rotate-45" />
                )
              ) : (
                <>
                  <span className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
                    {tab.icon && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center',
                          tab.active
                            ? 'text-[hsl(42_100%_66%)]'
                            : 'text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {renderIcon(tab.icon, { className: 'h-4 w-4' })}
                      </span>
                    )}
                    <span
                      className={cn(
                        'min-w-0 truncate text-center text-[12px] leading-tight font-black tracking-tight',
                        tab.active && 'text-[hsl(42_100%_66%)]',
                        tab.preview && 'italic opacity-70',
                      )}
                    >
                      {tab.title}
                    </span>
                  </span>

                  {closable && (
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className={cn(
                        'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-all',
                        showClose
                          ? 'hover:bg-muted opacity-70 hover:opacity-100'
                          : tab.dirty
                            ? 'opacity-100'
                            : 'pointer-events-none opacity-0',
                      )}
                      aria-label={`Close ${tab.title}`}
                    >
                      {tab.dirty && !showClose ? (
                        <span
                          className="h-2 w-2 rounded-none bg-amber-500"
                          aria-hidden
                        />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="min-w-[200px] rounded-none border p-0">
          {/* TAB section */}
          <div className="px-1 pt-1">
            {onPin && (
              <ContextMenuItem
                onClick={onPin}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
              >
                <Pin
                  className={cn('h-3 w-3 shrink-0', tab.pinned && 'rotate-45')}
                />
                {tab.pinned ? 'Unpin tab' : 'Pin tab'}
              </ContextMenuItem>
            )}

            {/* Group section — not for pinned tabs */}
            {hasGroupSection && (
              <>
                {tab.groupId ? (
                  <>
                    {onRemoveFromGroup && (
                      <ContextMenuItem
                        onClick={() => onRemoveFromGroup(tab.id)}
                        className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                      >
                        <Layers className="h-3 w-3 shrink-0" />
                        {groupLabels?.removeFromGroup ?? 'Remove from group'}
                      </ContextMenuItem>
                    )}
                    {otherGroups.length > 0 && onAddToGroup && (
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold">
                          <Layers className="h-3 w-3 shrink-0" />
                          {groupLabels?.moveToGroup ?? 'Move to group'}
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="min-w-[160px] rounded-none border p-1">
                          {otherGroups.map((g) => (
                            <ContextMenuItem
                              key={g.id}
                              onClick={() => onAddToGroup(tab.id, g.id)}
                              className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                            >
                              <div
                                className="h-2.5 w-2.5 shrink-0"
                                style={{
                                  backgroundColor: TAB_GROUP_COLOR_MAP[g.color],
                                }}
                              />
                              {g.title ||
                                (groupLabels?.unnamedGroup ?? 'Unnamed group')}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    )}
                    {onUngroupAll && (
                      <ContextMenuItem
                        onClick={() => onUngroupAll(tab.groupId!)}
                        className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                      >
                        <Layers className="h-3 w-3 shrink-0" />
                        {groupLabels?.ungroupAll ?? 'Ungroup all'}
                      </ContextMenuItem>
                    )}
                  </>
                ) : (
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold">
                      <Layers className="h-3 w-3 shrink-0" />
                      {groupLabels?.addToGroup ?? 'Add to group'}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="min-w-[160px] rounded-none border p-1">
                      {onCreateNewGroup && (
                        <ContextMenuItem
                          onClick={() => onCreateNewGroup(tab.id)}
                          className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                        >
                          <Plus className="h-3 w-3 shrink-0" />
                          {groupLabels?.newGroup ?? 'New group'}
                        </ContextMenuItem>
                      )}
                      {(groups ?? []).length > 0 && onCreateNewGroup && (
                        <ContextMenuSeparator className="my-0" />
                      )}
                      {(groups ?? []).map((g) =>
                        onAddToGroup ? (
                          <ContextMenuItem
                            key={g.id}
                            onClick={() => onAddToGroup(tab.id, g.id)}
                            className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                          >
                            <div
                              className="h-2.5 w-2.5 shrink-0"
                              style={{
                                backgroundColor: TAB_GROUP_COLOR_MAP[g.color],
                              }}
                            />
                            {g.title ||
                              (groupLabels?.unnamedGroup ?? 'Unnamed group')}
                          </ContextMenuItem>
                        ) : null,
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                )}
              </>
            )}
          </div>

          {/* REARRANGE section */}
          {(onMoveLeft || onMoveRight) && (
            <>
              <ContextMenuSeparator className="my-0" />
              <div className="px-1 py-1">
                <ContextMenuLabel className="text-muted-foreground/70 px-3 py-1.5 text-[11px] font-black tracking-widest uppercase">
                  Rearrange
                </ContextMenuLabel>
                {onMoveLeft && (
                  <ContextMenuItem
                    onClick={canMoveLeft ? onMoveLeft : undefined}
                    disabled={!canMoveLeft}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <ArrowLeft className="h-3 w-3 shrink-0" />
                    Move left
                  </ContextMenuItem>
                )}
                {onMoveRight && (
                  <ContextMenuItem
                    onClick={canMoveRight ? onMoveRight : undefined}
                    disabled={!canMoveRight}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    Move right
                  </ContextMenuItem>
                )}
              </div>
            </>
          )}

          {/* RELOAD section */}
          {onReload && (
            <>
              <ContextMenuSeparator className="my-0" />
              <div className="px-1 py-1">
                <ContextMenuItem
                  onClick={onReload}
                  className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                >
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  Reload tab
                </ContextMenuItem>
              </div>
            </>
          )}

          {/* CLOSE section */}
          {(closable || hasCloseGroupItems) && (
            <>
              <ContextMenuSeparator className="my-0" />
              <div className="px-1 py-1">
                <ContextMenuLabel className="text-muted-foreground/70 px-3 py-1.5 text-[11px] font-black tracking-widest uppercase">
                  Close
                </ContextMenuLabel>
                {closable && (
                  <ContextMenuItem
                    onClick={onClose}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    Close tab
                  </ContextMenuItem>
                )}
                {onCloseOthers && hasOtherCloseable && (
                  <ContextMenuItem
                    onClick={onCloseOthers}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    Close others
                  </ContextMenuItem>
                )}
                {hasTabsToCloseLeft && onCloseToLeft && (
                  <ContextMenuItem
                    onClick={onCloseToLeft}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    Close to the left
                  </ContextMenuItem>
                )}
                {hasTabsToCloseRight && onCloseToRight && (
                  <ContextMenuItem
                    onClick={onCloseToRight}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    Close to the right
                  </ContextMenuItem>
                )}
              </div>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deduplicateLabels(tabs: TabItem[]): TabItem[] {
  const counts = new Map<string, number>();
  for (const t of tabs) counts.set(t.title, (counts.get(t.title) ?? 0) + 1);
  const seen = new Map<string, number>();
  return tabs.map((t) => {
    if ((counts.get(t.title) ?? 0) <= 1) return t;
    const n = (seen.get(t.title) ?? 0) + 1;
    seen.set(t.title, n);
    return { ...t, title: `${t.title} ${n}` };
  });
}

// ---------------------------------------------------------------------------
// Inner list
// ---------------------------------------------------------------------------

function TabList({
  sortedTabs,
  activeRef,
  selectedTabIds,
  onSelectedTabIdsChange,
  anchorTabId,
  onAnchorTabIdChange,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabReorder,
  onNewTab,
  onReloadTab,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  tabGroups,
  groupLabels,
  onCreateGroup,
  onRenameGroup,
  onSetGroupColor,
  onCollapseGroup,
  onUngroupAll,
  onAddToGroup,
  onRemoveFromGroup,
  onCloseGroup,
  onCloseGroupPreservePinned,
  onPinGroup,
  onSelectionToggle,
}: {
  sortedTabs: TabItem[];
  activeRef: React.MutableRefObject<HTMLButtonElement | null>;
  selectedTabIds: Set<string>;
  onSelectedTabIdsChange: (ids: Set<string>) => void;
  anchorTabId: string | null;
  onAnchorTabIdChange: (id: string | null) => void;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabPin?: (id: string) => void;
  onTabReorder?: (activeId: string, overId: string) => void;
  onNewTab?: () => void;
  onReloadTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onCloseToLeft?: (id: string) => void;
  tabGroups?: TabGroupDef[];
  groupLabels?: TabGroupLabels;
  onCreateGroup?: (
    tabIds: string[],
    title?: string,
    color?: TabGroupColor,
  ) => string;
  onRenameGroup?: (groupId: string, title: string) => void;
  onSetGroupColor?: (groupId: string, color: TabGroupColor) => void;
  onCollapseGroup?: (groupId: string, collapsed: boolean) => void;
  onUngroupAll?: (groupId: string) => void;
  onAddToGroup?: (tabId: string, groupId: string) => void;
  onRemoveFromGroup?: (tabId: string) => void;
  onCloseGroup?: (groupId: string) => void;
  onCloseGroupPreservePinned?: (groupId: string) => void;
  onPinGroup?: (groupId: string) => void;
  onSelectionToggle?: (tabId: string) => void;
}) {
  const FLIP_DURATION = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)';
  const flipRefs = useRef(new Map<string, HTMLDivElement>());

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, []);

  function setFlipRef(id: string, el: HTMLDivElement | null) {
    if (el) flipRefs.current.set(id, el);
    else flipRefs.current.delete(id);
  }

  function animatedReorder(movingId: string, neighborId: string) {
    const aEl = flipRefs.current.get(movingId);
    const bEl = flipRefs.current.get(neighborId);

    if (aEl && bEl) {
      const aLeft = aEl.getBoundingClientRect().left;
      const bLeft = bEl.getBoundingClientRect().left;

      onTabReorder?.(movingId, neighborId);

      requestAnimationFrame(() => {
        const aDelta = aLeft - aEl.getBoundingClientRect().left;
        const bDelta = bLeft - bEl.getBoundingClientRect().left;
        if (aDelta === 0 && bDelta === 0) return;

        aEl.style.transform = `translateX(${aDelta}px)`;
        aEl.style.transition = 'none';
        bEl.style.transform = `translateX(${bDelta}px)`;
        bEl.style.transition = 'none';

        requestAnimationFrame(() => {
          aEl.style.transition = FLIP_DURATION;
          aEl.style.transform = '';
          bEl.style.transition = FLIP_DURATION;
          bEl.style.transform = '';
          const cleanup = (el: HTMLDivElement) =>
            el.addEventListener(
              'transitionend',
              () => {
                el.style.transition = '';
              },
              { once: true },
            );
          cleanup(aEl);
          cleanup(bEl);
        });
      });
    } else {
      onTabReorder?.(movingId, neighborId);
    }
  }

  const pinnedGroup = sortedTabs.filter((t) => t.pinned);
  const unpinnedGroup = sortedTabs.filter((t) => !t.pinned);

  function handleMoveLeft(tab: TabItem) {
    if (!onTabReorder) return;
    if (tab.groupId) {
      // Constrain within the same group
      const members = sortedTabs.filter((t) => t.groupId === tab.groupId);
      const idx = members.findIndex((t) => t.id === tab.id);
      if (idx <= 0) return;
      animatedReorder(tab.id, members[idx - 1]!.id);
      return;
    }
    const flatGroup = tab.pinned ? pinnedGroup : unpinnedGroup;
    const idx = flatGroup.findIndex((t) => t.id === tab.id);
    if (idx <= 0) return;
    // Can't move into a group block
    if (flatGroup[idx - 1]?.groupId) return;
    animatedReorder(tab.id, flatGroup[idx - 1]!.id);
  }

  function handleMoveRight(tab: TabItem) {
    if (!onTabReorder) return;
    if (tab.groupId) {
      // Constrain within the same group
      const members = sortedTabs.filter((t) => t.groupId === tab.groupId);
      const idx = members.findIndex((t) => t.id === tab.id);
      if (idx >= members.length - 1) return;
      animatedReorder(tab.id, members[idx + 1]!.id);
      return;
    }
    const flatGroup = tab.pinned ? pinnedGroup : unpinnedGroup;
    const idx = flatGroup.findIndex((t) => t.id === tab.id);
    if (idx >= flatGroup.length - 1) return;
    // Can't move into a group block
    if (flatGroup[idx + 1]?.groupId) return;
    animatedReorder(tab.id, flatGroup[idx + 1]!.id);
  }

  function handleTabSwitch(tab: TabItem, e: React.MouseEvent) {
    if (e.shiftKey) return; // handled by onShiftSelect
    onSelectedTabIdsChange(new Set());
    onAnchorTabIdChange(tab.id);
    onTabClick(tab.id);
  }

  function handleShiftSelect(tab: TabItem) {
    if (!anchorTabId) {
      onAnchorTabIdChange(tab.id);
      onSelectedTabIdsChange(new Set([tab.id]));
      return;
    }
    const visibleTabs = sortedTabs.filter(
      (t) => !t.groupCollapsed || t.id === tab.id,
    );
    const anchorIdx = visibleTabs.findIndex((t) => t.id === anchorTabId);
    const targetIdx = visibleTabs.findIndex((t) => t.id === tab.id);
    if (anchorIdx === -1 || targetIdx === -1) return;
    const [from, to] =
      anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    const range = visibleTabs.slice(from, to + 1).map((t) => t.id);
    onSelectedTabIdsChange(new Set(range));
  }

  // Keyboard navigation: Arrow keys move focus between tabs; Enter/Space activate.
  function handleTabKeyDown(e: React.KeyboardEvent, tabId: string) {
    const visibleIds = sortedTabs
      .filter((t) => !t.groupCollapsed || t.isGroupLeader)
      .map((t) => t.id);
    const idx = visibleIds.indexOf(tabId);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextId = visibleIds[idx + 1];
      if (nextId) document.getElementById(`tab-${nextId}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevId = visibleIds[idx - 1];
      if (prevId) document.getElementById(`tab-${prevId}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstId = visibleIds[0];
      if (firstId) document.getElementById(`tab-${firstId}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastId = visibleIds[visibleIds.length - 1];
      if (lastId) document.getElementById(`tab-${lastId}`)?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabClick(tabId);
    }
  }

  // Wheel-to-switch: scroll over tab strip → cycle active tab (200ms throttle).
  const lastWheelAt = useRef(0);
  function handleWheel(e: React.WheelEvent) {
    const now = Date.now();
    if (now - lastWheelAt.current < 200) return;
    lastWheelAt.current = now;
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 5) return;
    const activeTabId = sortedTabs.find((t) => t.active)?.id;
    const visibleIds = sortedTabs.map((t) => t.id);
    const currentIdx = activeTabId ? visibleIds.indexOf(activeTabId) : -1;
    if (currentIdx === -1) return;
    const nextId =
      delta > 0 ? visibleIds[currentIdx + 1] : visibleIds[currentIdx - 1];
    if (nextId) {
      e.preventDefault();
      onTabClick(nextId);
    }
  }

  const groupById = new Map((tabGroups ?? []).map((g) => [g.id, g]));

  // Deduplicate display labels: same title → append " 1", " 2", etc.
  const displayTabs = deduplicateLabels(sortedTabs);
  const displayById = new Map(displayTabs.map((t) => [t.id, t]));

  // Track last visible tab per group (used to close the group box with border-r)
  const lastTabIdByGroup = new Map<string, string>();
  // Track whether any tab in each group is pinned (for delete confirmation dialog)
  const groupHasPinned = new Map<string, boolean>();
  for (const t of sortedTabs) {
    if (t.groupId && !t.groupCollapsed) {
      lastTabIdByGroup.set(t.groupId, t.id);
    }
    if (t.groupId && t.pinned) {
      groupHasPinned.set(t.groupId, true);
    }
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => {
            scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
          }}
          className="bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted absolute left-0 z-10 flex h-[38px] w-6 shrink-0 cursor-pointer items-center justify-center border-r transition-colors"
          aria-label="Scroll tabs left"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => {
            scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
          }}
          className="bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted absolute right-0 z-10 flex h-[38px] w-6 shrink-0 cursor-pointer items-center justify-center border-l transition-colors"
          aria-label="Scroll tabs right"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="relative flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none' }}
        onWheel={handleWheel}
      >
        <div className="flex min-w-0 flex-1 items-center">
          {sortedTabs.map((tab) => {
            // Skip collapsed non-leaders — the pill alone represents the group
            if (tab.groupCollapsed && !tab.isGroupLeader) return null;

            const groupDef = tab.groupId
              ? groupById.get(tab.groupId)
              : undefined;

            // Collapsed leader → render only the pill, not the tab itself
            if (tab.groupCollapsed && tab.isGroupLeader && groupDef) {
              return (
                <TabGroupPill
                  key={tab.id}
                  group={groupDef}
                  hasPinnedTabs={groupHasPinned.get(groupDef.id) ?? false}
                  onRenameGroup={onRenameGroup}
                  onCollapseGroup={onCollapseGroup}
                  onSetGroupColor={onSetGroupColor}
                  onUngroupAll={onUngroupAll}
                  onCloseGroup={onCloseGroup}
                  onCloseGroupPreservePinned={onCloseGroupPreservePinned}
                  onPinGroup={onPinGroup}
                  labels={groupLabels}
                  flipRef={(el) => setFlipRef(`pill:${groupDef.id}`, el)}
                />
              );
            }

            const group = tab.pinned ? pinnedGroup : unpinnedGroup;
            const groupIdx = group.findIndex((t) => t.id === tab.id);

            let canMoveLeft: boolean;
            let canMoveRight: boolean;
            if (tab.groupId) {
              const members = sortedTabs.filter(
                (t) => t.groupId === tab.groupId,
              );
              const localIdx = members.findIndex((t) => t.id === tab.id);
              canMoveLeft = localIdx > 0;
              canMoveRight = localIdx < members.length - 1;
            } else {
              canMoveLeft = groupIdx > 0 && !group[groupIdx - 1]?.groupId;
              canMoveRight =
                groupIdx < group.length - 1 && !group[groupIdx + 1]?.groupId;
            }

            const unpinnedIdx = unpinnedGroup.findIndex((t) => t.id === tab.id);
            const hasTabsToCloseLeft = !tab.pinned && unpinnedIdx > 0;
            const hasTabsToCloseRight =
              !tab.pinned && unpinnedIdx < unpinnedGroup.length - 1;
            const hasOtherCloseable = tab.pinned
              ? unpinnedGroup.length > 0
              : unpinnedGroup.length > 1;

            return (
              <div key={tab.id} className="flex items-center">
                {/* Render group pill before the first (expanded) tab in each group */}
                {tab.isGroupLeader && groupDef && (
                  <TabGroupPill
                    group={groupDef}
                    hasPinnedTabs={groupHasPinned.get(groupDef.id) ?? false}
                    onRenameGroup={onRenameGroup}
                    onCollapseGroup={onCollapseGroup}
                    onSetGroupColor={onSetGroupColor}
                    onUngroupAll={onUngroupAll}
                    onCloseGroup={onCloseGroup}
                    onCloseGroupPreservePinned={onCloseGroupPreservePinned}
                    onPinGroup={onPinGroup}
                    labels={groupLabels}
                    flipRef={(el) => setFlipRef(`pill:${groupDef.id}`, el)}
                  />
                )}

                <SortableTabBarItem
                  tab={displayById.get(tab.id) ?? tab}
                  flipRef={(el) => setFlipRef(tab.id, el)}
                  onSwitch={(e) => handleTabSwitch(tab, e)}
                  onShiftSelect={() => handleShiftSelect(tab)}
                  onSelectionToggle={
                    onSelectionToggle
                      ? () => onSelectionToggle(tab.id)
                      : undefined
                  }
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  onClose={() => onTabClose(tab.id)}
                  onPin={onTabPin ? () => onTabPin(tab.id) : undefined}
                  onMoveLeft={
                    onTabReorder ? () => handleMoveLeft(tab) : undefined
                  }
                  onMoveRight={
                    onTabReorder ? () => handleMoveRight(tab) : undefined
                  }
                  onReload={onReloadTab ? () => onReloadTab(tab.id) : undefined}
                  onCloseOthers={
                    onCloseOthers ? () => onCloseOthers(tab.id) : undefined
                  }
                  onCloseToRight={
                    onCloseToRight ? () => onCloseToRight(tab.id) : undefined
                  }
                  onCloseToLeft={
                    onCloseToLeft ? () => onCloseToLeft(tab.id) : undefined
                  }
                  tabRef={tab.active ? activeRef : undefined}
                  closable={!tab.pinned && sortedTabs.length > 1}
                  canMoveLeft={canMoveLeft}
                  canMoveRight={canMoveRight}
                  hasTabsToCloseLeft={hasTabsToCloseLeft}
                  hasTabsToCloseRight={hasTabsToCloseRight}
                  hasOtherCloseable={hasOtherCloseable}
                  isSelected={selectedTabIds.has(tab.id)}
                  isGroupLastTab={
                    tab.groupId
                      ? lastTabIdByGroup.get(tab.groupId) === tab.id
                      : false
                  }
                  groups={tabGroups}
                  groupLabels={groupLabels}
                  onAddToGroup={onAddToGroup}
                  onRemoveFromGroup={onRemoveFromGroup}
                  onUngroupAll={onUngroupAll}
                  onCreateNewGroup={
                    onCreateGroup
                      ? (tabId) => onCreateGroup([tabId])
                      : undefined
                  }
                />
              </div>
            );
          })}

          {onNewTab && (
            <button
              type="button"
              onClick={onNewTab}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border ml-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-none border-b transition-colors"
              aria-label="New tab"
              title="New tab (Ctrl+T)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="border-border flex-1 self-stretch border-b" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

export function ProjectShellTabBar({
  tabs,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabReorder,
  onNewTab,
  onReloadTab,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  hasClosedTabs,
  onReopenClosedTab,
  trailing,
  leading,
  showSidebarTrigger = true,
  tabGroups,
  groupLabels,
  onCreateGroup,
  onRenameGroup,
  onSetGroupColor,
  onCollapseGroup,
  onUngroupAll,
  onAddToGroup,
  onRemoveFromGroup,
  onReorderGroup: _onReorderGroup,
  onCloseGroup,
  onCloseGroupPreservePinned,
  onPinGroup,
  onCreateGroupFromSelection,
  onCloseAllTabs,
  onPinAllTabs,
  onUnpinAllTabs,
}: Readonly<ProjectShellTabBarProps>) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Build ordered item IDs for SortableContext: group pills + tabs
  const sortableItems = (() => {
    const items: string[] = [];
    const seenGroups = new Set<string>();
    for (const tab of sortedTabs) {
      if (tab.groupCollapsed && !tab.isGroupLeader) continue;
      if (tab.isGroupLeader && tab.groupId && !seenGroups.has(tab.groupId)) {
        items.push(`group:${tab.groupId}`);
        seenGroups.add(tab.groupId);
      }
      if (!tab.groupCollapsed) {
        items.push(tab.id);
      }
    }
    return items;
  })();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Dragging a group pill — reorder the whole group block
    if (activeId.startsWith('group:')) {
      _onReorderGroup?.(activeId.slice('group:'.length), overId);
      return;
    }

    // Dropped onto a group pill — add ungrouped tab to that group
    if (overId.startsWith('group:')) {
      const activeTab = sortedTabs.find((t) => t.id === activeId);
      if (activeTab && !activeTab.groupId && !activeTab.pinned) {
        onAddToGroup?.(activeId, overId.slice('group:'.length));
      }
      return;
    }

    const activeTab = sortedTabs.find((t) => t.id === activeId);
    const overTab = sortedTabs.find((t) => t.id === overId);
    if (!activeTab || !overTab) return;

    // Grouped tab: can only reorder within the same group — blocked from leaving
    if (activeTab.groupId) {
      if (overTab.groupId === activeTab.groupId) {
        onTabReorder?.(activeId, overId);
      }
      return;
    }

    // Ungrouped tab dropped onto a grouped tab:
    // - On group leader FROM THE LEFT (tab came from before the group) → snap before group, don't join
    // - On any other group tab (middle/last or leader from right) → join the group at that position
    if (overTab.groupId && !activeTab.pinned) {
      const groupMembers = sortedTabs.filter(
        (t) => t.groupId === overTab.groupId && !t.groupCollapsed,
      );
      const isGroupLeader = groupMembers[0]?.id === overId;
      const activeIdx = sortedTabs.findIndex((t) => t.id === activeId);
      const overIdx = sortedTabs.findIndex((t) => t.id === overId);
      const draggingFromLeft = activeIdx < overIdx;

      if (isGroupLeader && draggingFromLeft) {
        // User is positioning BEFORE the group, not joining it
        onTabReorder?.(activeId, overId);
      } else {
        // Dropped between/inside group tabs — join the group at that position
        onAddToGroup?.(activeId, overTab.groupId);
      }
      return;
    }

    // Both ungrouped: normal reorder
    onTabReorder?.(activeId, overId);
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [tabs.find((t) => t.active)?.id]);

  const hasPinnedTabs = tabs.some((t) => t.pinned);
  const hasUnpinnedTabs = tabs.some((t) => !t.pinned);

  // Multi-select state — lifted here so the floating bar can render outside
  // the overflow-hidden tab bar container
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [anchorTabId, setAnchorTabId] = useState<string | null>(null);

  function handleGroupSelected() {
    if (onCreateGroupFromSelection && selectedTabIds.size >= 2) {
      onCreateGroupFromSelection([...selectedTabIds]);
    }
    setSelectedTabIds(new Set());
    setAnchorTabId(null);
  }

  function handleSelectionToggle(tabId: string) {
    setSelectedTabIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  }

  return (
    <div className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="flex h-[38px] shrink-0 items-center"
            role="tablist"
            aria-label="Open tabs"
          >
            {leading ? (
              <div className="border-border flex h-full shrink-0 items-center border-r border-b px-1.5">
                {leading}
              </div>
            ) : showSidebarTrigger ? (
              <div className="border-border flex h-full w-10 shrink-0 items-stretch border-r border-b">
                <ShellSidebarTrigger />
              </div>
            ) : null}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToHorizontalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableItems}
                strategy={horizontalListSortingStrategy}
              >
                <TabList
                  sortedTabs={sortedTabs}
                  activeRef={activeRef}
                  selectedTabIds={selectedTabIds}
                  onSelectedTabIdsChange={setSelectedTabIds}
                  anchorTabId={anchorTabId}
                  onAnchorTabIdChange={setAnchorTabId}
                  onTabClick={onTabClick}
                  onTabClose={onTabClose}
                  onTabPin={onTabPin}
                  onTabReorder={onTabReorder}
                  onNewTab={onNewTab}
                  onReloadTab={onReloadTab}
                  onCloseOthers={onCloseOthers}
                  onCloseToRight={onCloseToRight}
                  onCloseToLeft={onCloseToLeft}
                  tabGroups={tabGroups}
                  groupLabels={groupLabels}
                  onCreateGroup={onCreateGroup}
                  onRenameGroup={onRenameGroup}
                  onSetGroupColor={onSetGroupColor}
                  onCollapseGroup={onCollapseGroup}
                  onUngroupAll={onUngroupAll}
                  onAddToGroup={onAddToGroup}
                  onRemoveFromGroup={onRemoveFromGroup}
                  onCloseGroup={onCloseGroup}
                  onCloseGroupPreservePinned={onCloseGroupPreservePinned}
                  onPinGroup={onPinGroup}
                  onSelectionToggle={handleSelectionToggle}
                />
              </SortableContext>
            </DndContext>

            <div className="border-border flex h-full shrink-0 items-center gap-1 border-b border-l px-1.5">
              {hasClosedTabs && onReopenClosedTab && (
                <button
                  type="button"
                  onClick={onReopenClosedTab}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors"
                  aria-label="Reopen closed tab"
                  title="Reopen closed tab"
                >
                  <History className="h-3.5 w-3.5" />
                </button>
              )}
              {trailing}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="min-w-[180px] rounded-none border p-0">
          <div className="px-1 py-1">
            {onNewTab && (
              <ContextMenuItem
                onClick={onNewTab}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-bold tracking-tight"
              >
                <Plus className="h-3 w-3 shrink-0" />
                New tab
              </ContextMenuItem>
            )}
            {hasClosedTabs && onReopenClosedTab && (
              <ContextMenuItem
                onClick={onReopenClosedTab}
                className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
              >
                <History className="h-3 w-3 shrink-0" />
                Reopen closed tab
              </ContextMenuItem>
            )}
          </div>
          {(onPinAllTabs || onUnpinAllTabs || onCloseAllTabs) && (
            <>
              <ContextMenuSeparator className="my-0" />
              <div className="px-1 py-1">
                {onPinAllTabs && hasUnpinnedTabs && (
                  <ContextMenuItem
                    onClick={onPinAllTabs}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <Pin className="h-3 w-3 shrink-0" />
                    Pin all tabs
                  </ContextMenuItem>
                )}
                {onUnpinAllTabs && hasPinnedTabs && (
                  <ContextMenuItem
                    onClick={onUnpinAllTabs}
                    className="h-8 cursor-pointer gap-2.5 rounded-none px-3 text-xs font-semibold"
                  >
                    <Pin className="h-3 w-3 shrink-0 rotate-45" />
                    Unpin all tabs
                  </ContextMenuItem>
                )}
                {onCloseAllTabs && hasUnpinnedTabs && (
                  <ContextMenuItem
                    onClick={onCloseAllTabs}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 h-8 cursor-pointer gap-2.5 rounded-none px-3 text-[10px] font-bold tracking-widest uppercase"
                  >
                    <X className="h-3 w-3 shrink-0" />
                    Close all tabs
                  </ContextMenuItem>
                )}
              </div>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Multi-select floating action bar — rendered outside overflow containers */}
      {selectedTabIds.size >= 2 && (
        <div className="border-border bg-background absolute top-full left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border px-3 py-1.5 shadow-md">
          <span className="text-muted-foreground text-[10px] font-bold whitespace-nowrap">
            {selectedTabIds.size} {groupLabels?.selectedTabs ?? 'selected'}
          </span>
          <button
            type="button"
            onClick={handleGroupSelected}
            className="border-foreground bg-foreground text-background cursor-pointer border px-2 py-1 text-[10px] font-bold whitespace-nowrap transition-opacity hover:opacity-80"
          >
            {groupLabels?.groupSelected
              ? groupLabels.groupSelected.replace(
                  '{{count}}',
                  String(selectedTabIds.size),
                )
              : `Group ${selectedTabIds.size} tabs`}
          </button>
          {(tabGroups ?? []).length > 0 && onAddToGroup && (
            <select
              className="border-border bg-background text-foreground hover:border-foreground cursor-pointer border px-2 py-1 text-[10px] font-bold transition-colors outline-none"
              defaultValue=""
              onChange={(e) => {
                const groupId = e.target.value;
                if (!groupId) return;
                for (const tabId of selectedTabIds) {
                  onAddToGroup(tabId, groupId);
                }
                setSelectedTabIds(new Set());
                setAnchorTabId(null);
                e.target.value = '';
              }}
            >
              <option value="" disabled>
                {groupLabels?.addToGroup ?? 'Add to group'}
              </option>
              {(tabGroups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || (groupLabels?.unnamedGroup ?? 'Unnamed group')}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedTabIds(new Set());
              setAnchorTabId(null);
            }}
            className="text-muted-foreground hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center"
            aria-label="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
