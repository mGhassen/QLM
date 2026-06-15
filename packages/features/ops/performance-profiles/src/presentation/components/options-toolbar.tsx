import { useTranslation } from 'react-i18next';
import { RefreshCcw } from 'lucide-react';

import type { PerformanceProfile } from '@qlm/domain/entities';

import { Button } from '@qlm/ui/button';
import {
  ColumnChooser,
  FilterBuilder,
  type AdvancedColumn,
  type FilterRule,
  type SortState,
} from '@qlm/ui/data-table-advanced';
import {
  EntityListOptionsMenu,
  type EntityListSortOption,
} from '@qlm/ui/entity-list';
import { cn } from '@qlm/ui/utils';

type OptionsToolbarProps = Readonly<{
  isError: boolean;
  isFetching: boolean;
  sort: SortState | null;
  sortOptions: EntityListSortOption[];
  showQuickFilters: boolean;
  columns: AdvancedColumn<PerformanceProfile>[];
  filters: FilterRule[];
  visibleMap: Record<string, boolean>;
  onRefetch: () => void;
  onShowQuickFiltersChange: (next: boolean) => void;
  onSortChange: (next: SortState | null) => void;
  onFiltersChange: (rules: FilterRule[]) => void;
  onVisibleColumnsChange: (v: Record<string, boolean>) => void;
}>;

export function OptionsToolbar({
  isError,
  isFetching,
  sort,
  sortOptions,
  showQuickFilters,
  columns,
  filters,
  visibleMap,
  onRefetch,
  onShowQuickFiltersChange,
  onSortChange,
  onFiltersChange,
  onVisibleColumnsChange,
}: OptionsToolbarProps) {
  const { t } = useTranslation('performance-profiles');

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
        showDisplayMode={false}
        displayMode="table"
        onDisplayModeChange={() => {}}
        sortBy={sort?.key ?? 'labelName'}
        sortDirection={sort?.direction ?? 'asc'}
        sortOptions={sortOptions}
        onSortByChange={(key) =>
          onSortChange({ key, direction: sort?.direction ?? 'asc' })
        }
        onSortDirectionChange={(dir) =>
          onSortChange(sort ? { ...sort, direction: dir } : { key: 'labelName', direction: dir })
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

      <ColumnChooser
        columns={columns}
        visible={visibleMap}
        onVisibleChange={onVisibleColumnsChange}
        label={t('label')}
        resetLabel={t('reset')}
        iconOnly
      />
    </div>
  );
}
