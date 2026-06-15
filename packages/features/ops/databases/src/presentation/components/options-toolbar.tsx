import { useTranslation } from 'react-i18next';
import { RefreshCcw } from 'lucide-react';

import { Button } from '@guepard/ui/button';
import {
  ColumnChooser,
  FilterBuilder,
  type AdvancedColumn,
  type FilterRule,
  type SortState,
} from '@guepard/ui/data-table-advanced';
import {
  EntityListOptionsMenu,
  type EntityListSortOption,
} from '@guepard/ui/entity-list';
import { cn } from '@guepard/ui/utils';

import type { DatabaseOutput } from '@guepard/domain/usecases';

import type { DisplayMode } from '../../application/use-layout-prefs';

type OptionsToolbarProps = Readonly<{
  isError: boolean;
  isFetching: boolean;
  displayMode: DisplayMode;
  sort: SortState | null;
  sortOptions: EntityListSortOption[];
  showQuickFilters: boolean;
  onShowQuickFiltersChange: (next: boolean) => void;
  columns: AdvancedColumn<DatabaseOutput>[];
  filters: FilterRule[];
  visibleMap: Record<string, boolean>;
  onRefetch: () => void;
  onDisplayModeChange: (m: DisplayMode) => void;
  onSortChange: (next: SortState | null) => void;
  onFiltersChange: (rules: FilterRule[]) => void;
  onVisibleColumnsChange: (v: Record<string, boolean>) => void;
}>;

export function OptionsToolbar({
  isError,
  isFetching,
  displayMode,
  sort,
  sortOptions,
  showQuickFilters,
  onShowQuickFiltersChange,
  columns,
  filters,
  visibleMap,
  onRefetch,
  onDisplayModeChange,
  onSortChange,
  onFiltersChange,
  onVisibleColumnsChange,
}: OptionsToolbarProps) {
  const { t } = useTranslation('databases');
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-10 px-3 hover:bg-muted/40"
        onClick={onRefetch}
        aria-label={t('refresh')}
      >
        <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
      </Button>

      <EntityListOptionsMenu
        displayMode={displayMode === 'grid' ? 'grid' : 'table'}
        onDisplayModeChange={(m) => onDisplayModeChange(m === 'grid' ? 'grid' : 'list')}
        sortBy={sort?.key ?? 'status'}
        sortDirection={sort?.direction ?? 'asc'}
        sortOptions={sortOptions.filter((o) => visibleMap[o.value] !== false)}
        onSortByChange={(key) => onSortChange({ key, direction: sort?.direction ?? 'asc' })}
        onSortDirectionChange={(dir) =>
          onSortChange(sort ? { ...sort, direction: dir } : { key: 'status', direction: dir })
        }
        quickFiltersVisible={showQuickFilters}
        onQuickFiltersVisibleChange={onShowQuickFiltersChange}
        label={t('options')}
        iconOnly
      />

      {!isError && (
        <FilterBuilder
          columns={columns}
          rules={filters}
          onChange={onFiltersChange}
          triggerLabel={t('trigger')}
          addRuleLabel={t('addRule')}
          clearLabel={t('clear')}
          emptyLabel={t('filterEmpty')}
          enumAnyLabel={t('any')}
          enumCountLabel={(count) => t('selectedCount', { count })}
          applyLabel={t('apply')}
          cancelLabel={t('cancel')}
          maxRules={5}
          maxRulesLabel={(max) => t('maxRules', { max })}
          iconOnly
        />
      )}
      {displayMode === 'list' && (
        <ColumnChooser
          columns={columns}
          visible={visibleMap}
          onVisibleChange={onVisibleColumnsChange}
          label={t('label')}
          resetLabel={t('reset')}
          iconOnly
        />
      )}
    </div>
  );
}
