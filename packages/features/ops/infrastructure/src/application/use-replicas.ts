import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Replica } from './types';

async function fetchReplicas(projectId: string): Promise<Replica[]> {
  const res = await fetch(`/api/replicas?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error('Failed to fetch replicas');
  return res.json() as Promise<Replica[]>;
}

async function createReplica(
  body: Pick<Replica, 'projectId' | 'region' | 'provider' | 'computeTier'>,
): Promise<Replica> {
  const res = await fetch('/api/replicas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create replica');
  return res.json() as Promise<Replica>;
}

async function deleteReplica(id: string, projectId: string): Promise<void> {
  const res = await fetch(
    `/api/replicas/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete replica');
}

export function useReplicas(projectId: string) {
  const qc = useQueryClient();
  const key = ['replicas', projectId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchReplicas(projectId),
    enabled: !!projectId,
    // Poll while any replica is still provisioning.
    refetchInterval: (data) => {
      const list = data.state.data;
      return list?.some((r) => r.status === 'provisioning') ? 2_000 : false;
    },
  });

  const add = useMutation({
    mutationFn: createReplica,
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteReplica(id, projectId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  return { query, add, remove };
}
