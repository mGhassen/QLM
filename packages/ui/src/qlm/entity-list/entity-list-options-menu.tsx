import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  LayoutGrid,
  List,
  Settings2,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shadcn/select';

export type EntityListDisplayMode = 'grid' | 'table';
export type EntityListSortDirection = 'asc' | 'desc';

export type EntityListSortOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

export type EntityListOptionsMenuProps = {
  /** Hide the Display Mode section (still supports sort + toolbar toggles). */
  showDisplayMode?: boolean;
  displayMode: EntityListDisplayMode;
  onDisplayModeChange: (mode: EntityListDisplayMode) => void;

  sortBy: string;
  sortDirection: EntityListSortDirection;
  sortOptions: EntityListSortOption[];
  onSortByChange: (value: string) => void;
  onSortDirectionChange: (direction: EntityListSortDirection) => void;

  /** Optional toggle, typically used by list pages showing QuickFilterBar. */
  quickFiltersVisible?: boolean;
  onQuickFiltersVisibleChange?: (next: boolean) => void;

  /** Control the trigger button label. Defaults to "Options". */
  label?: string;
  /** Show icon only in the trigger button (no text label). */
  iconOnly?: boolean;
};

export function EntityListOptionsMenu({
  showDisplayMode = true,
  displayMode,
  onDisplayModeChange,
  sortBy,
  sortDirection,
  sortOptions,
  onSortByChange,
  onSortDirectionChange,
  quickFiltersVisible,
  onQuickFiltersVisibleChange,
  label = 'Options',
  iconOnly,
}: Readonly<EntityListOptionsMenuProps>) {
  const [open, setOpen] = useState(false);

  const showQuickFiltersToggle =
    typeof quickFiltersVisible === 'boolean' &&
    typeof onQuickFiltersVisibleChange === 'function';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground h-10 gap-1.5',
            iconOnly ? 'px-2.5' : 'px-3',
          )}
          aria-label={label}
        >
          <Settings2 className="h-4 w-4 shrink-0" />
          {!iconOnly && <span>{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border bg-popover min-w-64 rounded-none border p-1 shadow-xl"
      >
        {showDisplayMode && (
          <>
            {/* Display mode */}
            <div className="text-muted-foreground/60 px-2 pt-2 pb-1 text-[10px] font-bold tracking-tight uppercase">
              Display Mode
            </div>
            <div className="mb-2 flex flex-col gap-0.5">
              <DisplayModeItem
                icon={LayoutGrid}
                label="Grid view"
                active={displayMode === 'grid'}
                onClick={() => onDisplayModeChange('grid')}
              />
              <DisplayModeItem
                icon={List}
                label="Table view"
                active={displayMode === 'table'}
                onClick={() => onDisplayModeChange('table')}
              />
            </div>

            <DropdownMenuSeparator className="bg-border/40 mx-1 my-1" />
          </>
        )}

        {showQuickFiltersToggle && (
          <>
            <div className="text-muted-foreground/60 px-2 pt-2 pb-1 text-[10px] font-bold tracking-tight uppercase">
              Toolbar
            </div>
            <div className="mb-2 flex flex-col gap-0.5">
              <ToggleItem
                label="Show quick filters"
                active={quickFiltersVisible}
                onClick={() =>
                  onQuickFiltersVisibleChange(!quickFiltersVisible)
                }
              />
            </div>
            <DropdownMenuSeparator className="bg-border/40 mx-1 my-1" />
          </>
        )}

        {/* Sort by */}
        <div className="text-muted-foreground/60 px-2 pt-2 pb-1 text-[10px] font-bold tracking-tight uppercase">
          Sort Configuration
        </div>
        <div className="mt-1 flex items-center gap-2 px-2 pb-2">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="border-border bg-background focus:border-primary h-8 flex-1 cursor-pointer rounded-none border px-3 text-[11px] font-bold tracking-tight shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border shadow-lg">
              {sortOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="cursor-pointer rounded-none px-3 py-2 text-[11px] font-bold tracking-tight"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AscDescToggle
            direction={sortDirection}
            onChange={onSortDirectionChange}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Display mode item
// ---------------------------------------------------------------------------

function DisplayModeItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2 rounded-none border-l-2 border-transparent px-3 text-[11px] font-bold tracking-tight transition-all outline-none',
        active
          ? 'bg-foreground/5 border-primary text-foreground'
          : 'hover:bg-muted/50 focus:bg-muted/50 text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}

function ToggleItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2 rounded-none border-l-2 border-transparent px-3 text-[11px] font-bold tracking-tight transition-all outline-none',
        active
          ? 'bg-foreground/5 border-primary text-foreground'
          : 'hover:bg-muted/50 focus:bg-muted/50 text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="flex-1 text-left">{label}</span>
      <div
        className={cn(
          'flex h-4 w-4 items-center justify-center border transition-colors',
          active ? 'bg-primary border-primary' : 'border-border',
        )}
      >
        {active && (
          <Check className="text-primary-foreground h-3 w-3 stroke-[4px]" />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ASC/DESC toggle (small inline control)
// ---------------------------------------------------------------------------

function AscDescToggle({
  direction,
  onChange,
}: {
  direction: EntityListSortDirection;
  onChange: (direction: EntityListSortDirection) => void;
}) {
  return (
    <div
      role="group"
      onClick={(e) => e.stopPropagation()}
      className="border-border bg-muted/10 flex h-8 items-center gap-0.5 rounded-none border p-0.5"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange('asc');
        }}
        aria-label="Ascending"
        className={cn(
          'flex h-full cursor-pointer items-center gap-1.5 rounded-none px-3 text-[10px] font-bold tracking-tight transition-all outline-none',
          direction === 'asc'
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:bg-muted/40 focus:bg-muted/40',
        )}
      >
        <ArrowUp className="h-3 w-3" />
        <span>ASC</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange('desc');
        }}
        aria-label="Descending"
        className={cn(
          'flex h-full cursor-pointer items-center gap-1.5 rounded-none px-3 text-[10px] font-bold tracking-tight transition-all outline-none',
          direction === 'desc'
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:bg-muted/40 focus:bg-muted/40',
        )}
      >
        <ArrowDown className="h-3 w-3" />
        <span>DESC</span>
      </button>
    </div>
  );
}
