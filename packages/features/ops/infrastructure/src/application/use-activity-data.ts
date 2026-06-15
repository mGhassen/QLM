import { useQuery } from '@tanstack/react-query';

import type { InfrastructureActivity } from './types';

export type ActivitySource = 'primary' | 'replica';
export type ActivityRange = '7d' | '14d' | '30d';
export type { ActivityDataPoint as DataPoint } from './types';

async function fetchActivity(
  projectId: string,
  source: ActivitySource,
  range: ActivityRange,
): Promise<InfrastructureActivity> {
  const params = new URLSearchParams({ projectId, source, range });
  const res = await fetch(`/api/infrastructure/activity?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch infrastructure activity');
  return res.json() as Promise<InfrastructureActivity>;
}

export function useActivityData(
  projectId: string,
  source: ActivitySource,
  range: ActivityRange,
) {
  return useQuery({
    queryKey: ['infrastructure', 'activity', projectId, source, range] as const,
    queryFn: () => fetchActivity(projectId, source, range),
    enabled: !!projectId,
  });
}
