'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { Copy, Plus, Search } from 'lucide-react';

import { Badge } from '../shadcn/badge';
import { Button } from '../shadcn/button';
import { Checkbox } from '../shadcn/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../shadcn/command';
import { Label } from '../shadcn/label';
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/popover';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '../shadcn/select';
import { cn } from '../lib/utils';

import { SELECT_TRIGGER_CLASS } from './form-primitives';

export type UnifiedSelectorItem = {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  [key: string]: unknown;
};

type UnifiedSelectorMode = 'single' | 'multi';

type ManageLink = {
  href: string;
  text: string;
};

export type UnifiedSelectorProps<T extends UnifiedSelectorItem> = Readonly<{
  mode?: UnifiedSelectorMode;
  items: T[];
  isLoading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;

  selectedId?: string;
  selectedDisplayName?: string;
  onSelect?: (item: T) => void;
  onClearSelection?: () => void;
  onDuplicate?: (item: T) => void;
  onCreateNew?: () => void;

  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  buttonText?: string;
  manageLink?: ManageLink;
  className?: string;

  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  getDisplayName?: (item: T) => string;
}>;

function dedupeById<T extends UnifiedSelectorItem>(list: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of list) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}

export function UnifiedSelector<T extends UnifiedSelectorItem>(
  props: UnifiedSelectorProps<T>,
): React.ReactElement {
  const {
    mode = 'single',
    items,
    isLoading = false,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    selectedId,
    selectedDisplayName,
    onSelect,
    onClearSelection,
    onDuplicate,
    onCreateNew,
    selectedIds = [],
    onSelectionChange,
    id,
    label,
    required = false,
    disabled = false,
    placeholder,
    searchPlaceholder,
    buttonText,
    manageLink,
    className,
    renderItem,
    getDisplayName,
  } = props;

  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [epoch, setEpoch] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const sourceItems = dedupeById(items);
  const selectedIdsKey = selectedIds.join(',');

  const displayOf = (item: T) =>
    getDisplayName?.(item) ??
    item.name ??
    item.code ??
    t('unifiedSelector.unnamedItem', { id: item.id });

  const filteredItems = sourceItems.filter((item) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      displayOf(item).toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q) ||
      (item.code ?? '').toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  const hasSelectedId = typeof selectedId === 'string' && selectedId.length > 0;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSearch('');
      setEpoch((e) => e + 1);
    }
  };

  const handleSelect = (item: T) => {
    setOpen(false);
    setSearch('');
    onSelect?.(item);
  };

  const handleClear = () => {
    setOpen(false);
    setSearch('');
    onClearSelection?.();
  };

  const handleDuplicate = (item: T) => {
    setOpen(false);
    setSearch('');
    onDuplicate?.(item);
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearch('');
    onCreateNew?.();
  };

  const handleCheckbox = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, itemId]);
    } else {
      onSelectionChange?.(selectedIds.filter((x) => x !== itemId));
    }
  };

  // Center the cmdk-highlighted row inside the scrollable list so the pre-
  // selected item is visible when the popover opens. cmdk handles
  // scrollIntoView itself but loses it when the list remounts; re-apply.
  useLayoutEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;

    const center = () => {
      const active = root.querySelector<HTMLElement>(
        '[cmdk-item=""][aria-selected="true"]',
      );
      if (!active) return;
      const sr = root.getBoundingClientRect();
      const ir = active.getBoundingClientRect();
      const top = root.scrollTop + (ir.top - sr.top);
      const nextTop = top + ir.height / 2 - root.clientHeight / 2;
      const maxTop = Math.max(0, root.scrollHeight - root.clientHeight);
      root.scrollTo({
        top: Math.max(0, Math.min(nextTop, maxTop)),
        behavior: 'instant',
      });
    };

    center();
    const raf = requestAnimationFrame(center);
    return () => cancelAnimationFrame(raf);
  }, [
    open,
    epoch,
    mode,
    search,
    sourceItems.length,
    selectedId,
    selectedIdsKey,
  ]);

  // Infinite scroll: trigger onLoadMore when near the bottom of the list.
  useEffect(() => {
    if (!open || !hasMore || !onLoadMore || loadingMore) return;
    const list = listRef.current;
    if (!list) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = list;
        if (scrollHeight - scrollTop - clientHeight < 150) onLoadMore();
        ticking = false;
      });
    };
    list.addEventListener('scroll', onScroll, { passive: true });
    return () => list.removeEventListener('scroll', onScroll);
  }, [open, hasMore, onLoadMore, loadingMore]);

  const displayLabel = label
    ? required && !label.endsWith(' *')
      ? `${label} *`
      : label
    : undefined;

  const LabelRow =
    displayLabel !== undefined ? (
      manageLink ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>{displayLabel}</Label>
          <a
            href={manageLink.href}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
          >
            {manageLink.text}
          </a>
        </div>
      ) : (
        <Label htmlFor={id}>{displayLabel}</Label>
      )
    ) : null;

  const renderDefaultSingle = (item: T, isSelectedRow: boolean) => (
    <div className="relative flex w-full items-center justify-between gap-3 py-2 pr-8 pl-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">
          {displayOf(item)}
        </span>
        {item.description && (
          <span className="text-muted-foreground truncate text-xs">
            {item.description}
          </span>
        )}
      </div>
      {isSelectedRow ? (
        <CheckIcon
          className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 shrink-0 -translate-y-1/2"
          aria-hidden
        />
      ) : null}
      {onDuplicate && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleDuplicate(item);
          }}
          aria-label={t('unifiedSelector.duplicate')}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const renderDefaultMulti = (item: T, isSelected: boolean) => (
    <div className="flex w-full items-start gap-2">
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => handleCheckbox(item.id, Boolean(checked))}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mt-0.5',
          'group-data-[selected=true]:border-background group-data-[selected=true]:data-[state=checked]:bg-background group-data-[selected=true]:data-[state=checked]:text-foreground',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">
          {displayOf(item)}
        </span>
        {item.description && (
          <span className="text-muted-foreground group-data-[selected=true]:text-background/70 truncate text-xs">
            {item.description}
          </span>
        )}
      </div>
    </div>
  );

  if (mode === 'single') {
    const itemsIncludingPrefill =
      hasSelectedId && !sourceItems.some((i) => i.id === selectedId)
        ? ([
            {
              id: selectedId,
              name:
                selectedDisplayName ??
                t('unifiedSelector.unnamedItem', { id: selectedId }),
            } as T,
            ...sourceItems,
          ] as T[])
        : sourceItems;

    const selectedItem = hasSelectedId
      ? itemsIncludingPrefill.find((i) => i.id === selectedId)
      : undefined;

    const filteredSingle = itemsIncludingPrefill.filter((item) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        displayOf(item).toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        (item.code ?? '').toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });

    const displayButtonText =
      buttonText ??
      (selectedItem
        ? displayOf(selectedItem)
        : (selectedDisplayName ??
          placeholder ??
          t('unifiedSelector.selectOne')));

    return (
      <div className="space-y-2">
        {LabelRow}
        <Popover
          open={disabled ? false : open}
          onOpenChange={disabled ? undefined : handleOpenChange}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              id={id}
              disabled={disabled}
              className={cn(
                SELECT_TRIGGER_CLASS,
                'ring-offset-background focus-visible:ring-ring flex w-full items-center justify-between gap-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate',
                className,
              )}
            >
              <span>{displayButtonText}</span>
              <ChevronDownIcon
                className="h-4 w-4 shrink-0 opacity-60"
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="border-border bg-popover text-popover-foreground z-[200] w-96 max-w-[min(24rem,calc(100vw-2rem))] rounded-none border p-0 shadow-2xl backdrop-blur-sm outline-none"
            align="start"
            sideOffset={5}
          >
            <Command
              key={epoch}
              shouldFilter={false}
              defaultValue={hasSelectedId ? selectedId : undefined}
              className="rounded-none"
            >
              <div className="border-border bg-muted/20 group flex items-center border-b px-3.5">
                <Search className="text-muted-foreground/50 group-focus-within:text-primary mr-2.5 h-3.5 w-3.5 shrink-0 transition-colors" />
                <input
                  type="text"
                  placeholder={
                    searchPlaceholder ?? t('unifiedSelector.searchPlaceholder')
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  className="placeholder:text-muted-foreground/40 flex h-10 w-full border-0 bg-transparent py-3 text-[13px] font-bold tracking-tight shadow-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <CommandList ref={listRef} className="max-h-80">
                <CommandEmpty>
                  {isLoading
                    ? t('unifiedSelector.loading')
                    : t('unifiedSelector.noMatches')}
                </CommandEmpty>

                {onClearSelection && (
                  <CommandGroup>
                    <CommandItem
                      value="__clear__"
                      onSelect={handleClear}
                      className="data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground cursor-pointer rounded-none px-3 py-2 text-[11px] font-bold tracking-tight uppercase transition-all"
                    >
                      <span className="text-muted-foreground">
                        {t('unifiedSelector.clearSelection')}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {filteredSingle.length > 0 ? (
                  <CommandGroup>
                    {filteredSingle.map((item) => {
                      const isSelected = item.id === selectedId;
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className={cn(
                            'data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground cursor-pointer rounded-none p-0 text-sm transition-all',
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {renderItem
                            ? renderItem(item, isSelected)
                            : renderDefaultSingle(item, isSelected)}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ) : null}

                {hasMore && onLoadMore && (
                  <CommandGroup>
                    <CommandItem
                      value="__load_more__"
                      onSelect={() => onLoadMore()}
                      disabled={loadingMore}
                      className="text-muted-foreground hover:bg-muted/50 flex cursor-pointer items-center justify-center border-t py-2 text-xs"
                    >
                      {loadingMore
                        ? t('unifiedSelector.loading')
                        : t('unifiedSelector.loadMore')}
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
              {onCreateNew && (
                <div className="bg-muted/30 flex shrink-0 border-t px-3 py-2">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    {t('unifiedSelector.createNew')}
                  </button>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // --- multi mode ---
  return (
    <div className="space-y-2">
      {LabelRow}
      <Select open={open} onOpenChange={handleOpenChange}>
        <SelectTrigger
          id={id}
          className={cn(
            SELECT_TRIGGER_CLASS,
            'ring-offset-background focus-visible:ring-ring flex h-10 w-full items-center justify-between gap-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate',
            className,
          )}
        >
          <SelectValue
            placeholder={
              selectedIds.length > 0
                ? t('unifiedSelector.countSelected', {
                    count: selectedIds.length,
                  })
                : (placeholder ?? t('unifiedSelector.selectMultiple'))
            }
          />
        </SelectTrigger>
        <SelectContent
          className="border-border z-[200] rounded-none border p-0 shadow-2xl backdrop-blur-sm"
          align="start"
        >
          <Command
            key={epoch}
            shouldFilter={false}
            defaultValue={selectedIds[0]}
            className="rounded-none"
          >
            <div className="border-border bg-muted/20 group flex items-center border-b px-3.5">
              <Search className="text-muted-foreground/50 group-focus-within:text-primary mr-2.5 h-3.5 w-3.5 shrink-0 transition-colors" />
              <input
                type="text"
                placeholder={
                  searchPlaceholder ?? t('unifiedSelector.searchPlaceholder')
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                className="placeholder:text-muted-foreground/40 flex h-10 w-full border-0 bg-transparent py-3 text-[13px] font-bold tracking-tight shadow-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList ref={listRef} className="max-h-80">
              <CommandEmpty>
                {isLoading
                  ? t('unifiedSelector.loading')
                  : t('unifiedSelector.noMatches')}
              </CommandEmpty>

              {filteredItems.length > 0 && (
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleCheckbox(item.id, !isSelected)}
                        className="group data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground cursor-pointer rounded-none px-3 py-2 text-sm transition-all"
                      >
                        {renderItem
                          ? renderItem(item, isSelected)
                          : renderDefaultMulti(item, isSelected)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {hasMore && onLoadMore && (
                <CommandGroup>
                  <CommandItem
                    value="__load_more__"
                    onSelect={() => onLoadMore()}
                    disabled={loadingMore}
                    className="text-muted-foreground border-border data-[selected=true]:bg-foreground data-[selected=true]:text-background flex cursor-pointer items-center justify-center rounded-none border-t-2 py-2 text-xs"
                  >
                    {loadingMore
                      ? t('unifiedSelector.loading')
                      : t('unifiedSelector.loadMore')}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </SelectContent>
      </Select>
      {selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedIds.map((sid) => {
            const item = sourceItems.find((i) => i.id === sid);
            if (!item) return null;
            return (
              <Badge
                key={sid}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  onSelectionChange?.(selectedIds.filter((x) => x !== sid))
                }
              >
                {displayOf(item)}
                <span className="ml-1">×</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
