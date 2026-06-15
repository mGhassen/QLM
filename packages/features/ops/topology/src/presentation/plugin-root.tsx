import { useCallback, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { encodeTabId } from '@guepard/shell-contracts';
import { useShell } from '@guepard/shell-runtime';

import type { Node } from '@guepard/domain/entities';

import type { TopologyPool } from '../application/use-topology-data';
import { TopologyPage, type TopologyView } from './components/topology-page';
import { TopologyPoolSheet } from './components/topology-pool-sheet';

type TopologyUrlState = Readonly<{
  q?: string;
  view?: TopologyView;
}>;

function parseUrlState(raw: unknown): TopologyUrlState {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const q = typeof r.q === 'string' ? r.q : undefined;
  const view = r.view === 'hosts' || r.view === 'pools' ? r.view : undefined;
  return { q, view };
}

export function TopologyPluginRoot() {
  const shell = useShell();
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false });
  const urlState = parseUrlState(rawSearch);

  const [poolSheetOpen, setPoolSheetOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<TopologyPool | null>(null);

  const search = urlState.q ?? '';
  const view: TopologyView = urlState.view ?? 'pools';

  const setSearch = useCallback(
    (next: string) => {
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'topology' },
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          q: next || undefined,
        }),
        replace: true,
      });
    },
    [navigate, shell.projectSlug],
  );

  const setView = useCallback(
    (next: TopologyView) => {
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'topology' },
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          view: next === 'pools' ? undefined : next,
        }),
        replace: true,
      });
    },
    [navigate, shell.projectSlug],
  );

  const handleOpenPool = useCallback((pool: TopologyPool) => {
    setSelectedPool(pool);
    setPoolSheetOpen(true);
  }, []);

  const handleDrillInto = useCallback(
    (pool: TopologyPool) => {
      const search: Record<string, string | string[]> = {
        region: pool.region,
        tid: encodeTabId({
          kind: 'topology-pool',
          provider: pool.provider,
          region: pool.region,
          cluster: pool.cluster ?? null,
        }),
      };
      if (pool.provider !== 'unknown') search.provider = pool.provider;
      if (pool.cluster) search.cluster = pool.cluster;
      else search.nocl = '1';
      setPoolSheetOpen(false);
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
        search,
      });
    },
    [navigate, shell.projectSlug],
  );

  const handleOpenNode = useCallback(
    (node: Node) => {
      setPoolSheetOpen(false);
      void navigate({
        to: '/prj/$projectSlug/$routeBase',
        params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
        search: {
          q: node.name,
          tid: encodeTabId({ kind: 'topology-node', nodeId: node.id }),
        },
      });
    },
    [navigate, shell.projectSlug],
  );

  const handleAttentionClick = useCallback(() => {
    setPoolSheetOpen(false);
    void navigate({
      to: '/prj/$projectSlug/$routeBase',
      params: { projectSlug: shell.projectSlug, routeBase: 'infrastructure' },
      search: {
        health: ['critical', 'degraded'],
        tid: encodeTabId({ kind: 'topology-attention' }),
      },
    });
  }, [navigate, shell.projectSlug]);

  return (
    <>
      <TopologyPage
        projectId={shell.projectId}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        onOpenPool={handleOpenPool}
        onOpenNode={handleOpenNode}
        onAttentionClick={handleAttentionClick}
      />
      <TopologyPoolSheet
        pool={selectedPool}
        open={poolSheetOpen}
        onOpenChange={(open) => {
          setPoolSheetOpen(open);
          if (!open) setSelectedPool(null);
        }}
        onOpenNode={handleOpenNode}
        onDrillInto={handleDrillInto}
      />
    </>
  );
}
