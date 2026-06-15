import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid2X2, LayoutGrid, Network, RefreshCcw, type LucideIcon } from 'lucide-react';

import { EntityListPage } from '@guepard/ui/entity-list';
import {
  EntityErrorBanner,
  EntityLoadingCardsSkeleton,
} from '@guepard/ui/entity-state';
import { cn } from '@guepard/ui/utils';

import type { TopologyPool } from '../../application/use-topology-data';
import { useTopologyData } from '../../application/use-topology-data';
import { TopologyFleetSummary } from './topology-fleet-summary';
import { TopologyHostMap } from './topology-host-map';
import { TopologyPoolCard } from './topology-pool-card';
import { TopologyOptionsMenu } from './options-menu';
import { Button } from '@guepard/ui/button';

export type TopologyView = 'pools' | 'hosts';

export type TopologyPageProps = Readonly<{
  projectId: string;
  /** Controlled search; falls back to local state when absent. */
  search?: string;
  onSearchChange?: (next: string) => void;
  /** Controlled view mode; falls back to local state when absent. */
  view?: TopologyView;
  onViewChange?: (next: TopologyView) => void;
  onOpenPool?: (pool: TopologyPool) => void;
  onOpenNode?: (node: import('@guepard/domain/entities').Node) => void;
  /** Drill into nodes filtered by needs-attention statuses. */
  onAttentionClick?: () => void;
}>;

export function TopologyPage({
  projectId,
  search: searchProp,
  onSearchChange,
  view: viewProp,
  onViewChange,
  onOpenPool,
  onOpenNode,
  onAttentionClick,
}: TopologyPageProps) {
  const { t } = useTranslation('topology');
  const [searchLocal, setSearchLocal] = useState('');
  const [viewLocal, setViewLocal] = useState<TopologyView>('pools');
  const search = searchProp ?? searchLocal;
  const setSearch = onSearchChange ?? setSearchLocal;
  const view = viewProp ?? viewLocal;
  const setView = onViewChange ?? setViewLocal;
  const { nodesQuery, poolsQuery, summaryQuery, pressureQuery, rows, pools, summary, pressurePoints } =
    useTopologyData(projectId);

  const onRefetch = () => {
    void nodesQuery.refetch();
    void poolsQuery.refetch();
    void summaryQuery.refetch();
    void pressureQuery.refetch();
  };

  const filteredPools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pools;
    return pools.filter((p) =>
      [p.provider, p.region, p.cluster ?? ''].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [pools, search]);

  const optionsSlot = (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-10 px-3 hover:bg-muted/40"
        onClick={onRefetch}
        aria-label={t('refresh')}
      >
        <RefreshCcw className={cn('h-4 w-4', (nodesQuery.isFetching || poolsQuery.isFetching) && 'animate-spin')} />
      </Button>
      <TopologyOptionsMenu
        view={view}
        onViewChange={setView}
        iconOnly
      />
    </div>
  );

  return (
    <EntityListPage
      title={t('list.title')}
      description={t('list.description')}
      searchPlaceholder={t('list.searchPlaceholder')}
      searchValue={search}
      onSearchChange={setSearch}
      options={optionsSlot}
      stretchContent
    >
      {nodesQuery.isError ? (
        <EntityErrorBanner
          title={t('error.title')}
          description={t('error.description')}
          retryLabel={t('error.retry')}
          onRetry={() => nodesQuery.refetch()}
        />
      ) : nodesQuery.isLoading ? (
        <EntityLoadingCardsSkeleton count={4} />
      ) : rows.length === 0 ? (
        <TopologyEmpty
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div className="flex h-full min-h-0 gap-3">
          {summary && (
            <TopologyFleetSummary
              summary={summary}
              pressurePoints={pressurePoints}
              onAttentionClick={onAttentionClick}
              onPressureSelect={(nodeId) => {
                const node = rows.find((n) => n.id === nodeId);
                if (node) onOpenNode?.(node);
              }}
            />
          )}
          <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-1">
            {view === 'hosts' ? (
              <TopologyHostMap rows={rows} onOpenNode={onOpenNode} />
            ) : filteredPools.length === 0 ? (
              <TopologyEmpty
                title={t('empty.filteredTitle')}
                description={t('empty.filteredDescription')}
              />
            ) : (
              <div className="flex flex-col gap-4 pb-8">
                {filteredPools.map((pool) => (
                  <TopologyPoolCard
                    key={pool.id}
                    pool={pool}
                    onClick={onOpenPool}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </EntityListPage>
  );
}


type TopologyEmptyProps = Readonly<{ title: string; description: string }>;
function TopologyEmpty({ title, description }: TopologyEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center min-h-[280px]">
      <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border-2">
        <Network className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-foreground text-base font-semibold">{title}</p>
      <p className="text-muted-foreground mx-auto max-w-md text-sm">
        {description}
      </p>
    </div>
  );
}
