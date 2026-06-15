import { useQuery } from '@tanstack/react-query';

import type { InfrastructureSettings } from './types';

async function fetchSettings(projectId: string): Promise<InfrastructureSettings> {
  const res = await fetch(
    `/api/infrastructure/settings?projectId=${encodeURIComponent(projectId)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch infrastructure settings');
  return res.json() as Promise<InfrastructureSettings>;
}

export function useInfrastructureSettings(projectId: string) {
  return useQuery({
    queryKey: ['infrastructure', 'settings', projectId] as const,
    queryFn: () => fetchSettings(projectId),
    enabled: !!projectId,
  });
}
