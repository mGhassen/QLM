import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@qlm/ui/sonner';

import type {
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@qlm/domain/entities';
import { useShell } from '@qlm/shell-runtime';

/**
 * Project-scoped nodes query + CRUD mutations with optimistic cache
 * patches on `update` / `delete` / `setLifecycle` / `setEligibility` /
 * `drain` / `drainCancel` and a partial-failure toast on bulk delete.
 * Create / bulk-delete keep a full list invalidate because they shift
 * pagination / need server-side reconciliation.
 *
 * Returns the raw `useQuery` handle + a `mutations` object so the page
 * component can still call `mutations.update.mutateAsync(...)` etc.
 * unchanged.
 */
export function useData(projectId: string) {
  const { t } = useTranslation('nodes');
  const shell = useShell();
  const queryClient = useQueryClient();

  const listQueryKey = shell.nodes.keys.listByProject(projectId);

  const nodesQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => shell.nodes.list({ projectId }),
    enabled: !!projectId,
  });

  /**
   * Cancel any in-flight refetch before applying an optimistic patch so
   * a late response doesn't clobber the patch. Standard React Query
   * optimistic-update idiom.
   */
  const cancelListQuery = () =>
    queryClient.cancelQueries({ queryKey: listQueryKey });
  const cancelDetailQuery = (id: string) =>
    queryClient.cancelQueries({ queryKey: shell.nodes.keys.detail(id) });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof shell.nodes.create>[0]) =>
      shell.nodes.create(input),
    onSuccess: () => shell.nodes.invalidate.list(projectId),
  });

  const update = useMutation({
    mutationFn: (input: Parameters<typeof shell.nodes.update>[0]) =>
      shell.nodes.update(input),
    onMutate: async (input) => {
      await Promise.all([cancelListQuery(), cancelDetailQuery(input.id)]);
      const prevList = shell.nodes.getListCache(projectId);
      const prevDetail = shell.nodes.getDetailCache(input.id);
      shell.nodes.updateListCache(projectId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((n) =>
            n.id === input.id ? { ...n, ...input } : n,
          ),
        };
      });
      shell.nodes.updateDetailCache(input.id, (prev) =>
        prev ? { ...prev, ...input } : prev,
      );
      return { prevList, prevDetail };
    },
    onError: (_err, input, ctx) => {
      if (!ctx) return;
      shell.nodes.restoreListCache(projectId, ctx.prevList);
      shell.nodes.restoreDetailCache(input.id, ctx.prevDetail);
    },
    onSettled: (node) => {
      if (node) shell.nodes.invalidate.detail(node.id);
    },
  });

  /**
   * 409 / version-conflict handler shared by every five-axis mutation.
   * Restores the optimistic snapshot then surfaces the `conflictStale`
   * toast so ops know the row was changed under them.
   */
  function handleAxisError(
    err: unknown,
    id: string,
    ctx: { prevList: ReturnType<typeof shell.nodes.getListCache>; prevDetail: ReturnType<typeof shell.nodes.getDetailCache> } | undefined,
  ) {
    if (ctx) {
      shell.nodes.restoreListCache(projectId, ctx.prevList);
      shell.nodes.restoreDetailCache(id, ctx.prevDetail);
    }
    const status = (err as { status?: number } | undefined)?.status;
    const code = (err as { code?: number } | undefined)?.code;
    if (status === 409 || code === 3001 || code === 3101) {
      toast.warning(t('conflictStale'));
      shell.nodes.invalidate.detail(id);
    }
  }

  async function snapshotFor(id: string) {
    await Promise.all([cancelListQuery(), cancelDetailQuery(id)]);
    return {
      prevList: shell.nodes.getListCache(projectId),
      prevDetail: shell.nodes.getDetailCache(id),
    };
  }

  const setLifecycle = useMutation({
    mutationFn: (input: {
      id: string;
      lifecycle: NodeLifecycleState;
      expectedVersion: number;
    }) => shell.nodes.setLifecycle(input),
    onMutate: async (input) => {
      const snap = await snapshotFor(input.id);
      shell.nodes.updateListCache(projectId, (prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.map((n) =>
              n.id === input.id ? { ...n, lifecycle: input.lifecycle } : n,
            ),
          }
          : prev,
      );
      shell.nodes.updateDetailCache(input.id, (prev) =>
        prev ? { ...prev, lifecycle: input.lifecycle } : prev,
      );
      return snap;
    },
    onError: (err, input, ctx) => handleAxisError(err, input.id, ctx),
    onSettled: (node) => {
      if (node) shell.nodes.invalidate.detail(node.id);
    },
  });

  const setEligibility = useMutation({
    mutationFn: (input: {
      id: string;
      eligibility: NodeEligibility;
      expectedVersion: number;
    }) => shell.nodes.setEligibility(input),
    onMutate: async (input) => {
      const snap = await snapshotFor(input.id);
      shell.nodes.updateListCache(projectId, (prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.map((n) =>
              n.id === input.id
                ? { ...n, eligibility: input.eligibility }
                : n,
            ),
          }
          : prev,
      );
      shell.nodes.updateDetailCache(input.id, (prev) =>
        prev ? { ...prev, eligibility: input.eligibility } : prev,
      );
      return snap;
    },
    onError: (err, input, ctx) => handleAxisError(err, input.id, ctx),
    onSettled: (node) => {
      if (node) shell.nodes.invalidate.detail(node.id);
    },
  });

  const drain = useMutation({
    mutationFn: (input: {
      id: string;
      drain: NodeDrain;
      expectedVersion: number;
      setIneligibleOnStart?: boolean;
    }) => shell.nodes.drain(input),
    onMutate: async (input) => {
      const snap = await snapshotFor(input.id);
      const flipEligibility = input.setIneligibleOnStart !== false;
      shell.nodes.updateListCache(projectId, (prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.map((n) =>
              n.id === input.id
                ? {
                  ...n,
                  drain: { ...input.drain, active: true },
                  eligibility: flipEligibility ? 'ineligible' : n.eligibility,
                }
                : n,
            ),
          }
          : prev,
      );
      shell.nodes.updateDetailCache(input.id, (prev) =>
        prev
          ? {
            ...prev,
            drain: { ...input.drain, active: true },
            eligibility: flipEligibility ? 'ineligible' : prev.eligibility,
          }
          : prev,
      );
      return snap;
    },
    onError: (err, input, ctx) => handleAxisError(err, input.id, ctx),
    onSettled: (node) => {
      if (node) shell.nodes.invalidate.detail(node.id);
    },
  });

  const drainCancel = useMutation({
    mutationFn: (input: {
      id: string;
      expectedVersion: number;
      keepIneligible?: boolean;
    }) => shell.nodes.drainCancel(input),
    onMutate: async (input) => {
      const snap = await snapshotFor(input.id);
      const restoreEligibility = input.keepIneligible === false;
      shell.nodes.updateListCache(projectId, (prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.map((n) =>
              n.id === input.id
                ? {
                  ...n,
                  drain: undefined,
                  eligibility: restoreEligibility ? 'eligible' : n.eligibility,
                }
                : n,
            ),
          }
          : prev,
      );
      shell.nodes.updateDetailCache(input.id, (prev) =>
        prev
          ? {
            ...prev,
            drain: undefined,
            eligibility: restoreEligibility ? 'eligible' : prev.eligibility,
          }
          : prev,
      );
      return snap;
    },
    onError: (err, input, ctx) => handleAxisError(err, input.id, ctx),
    onSettled: (node) => {
      if (node) shell.nodes.invalidate.detail(node.id);
    },
  });

  const deleteNode = useMutation({
    mutationFn: (id: string) => shell.nodes.delete(id),
    onMutate: async (id) => {
      await cancelListQuery();
      const prevList = shell.nodes.getListCache(projectId);
      shell.nodes.updateListCache(projectId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((n) => n.id !== id),
          total: Math.max(0, prev.total - 1),
        };
      });
      return { prevList };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      shell.nodes.restoreListCache(projectId, ctx.prevList);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => shell.nodes.bulkDelete(ids),
    // Partial failures require reconciliation with server truth —
    // keep the nuclear invalidate + surface a warning toast when any
    // item failed so ops knows which ids to retry.
    onSuccess: (result) => {
      shell.nodes.invalidate.list(projectId);
      if (result.failed.length > 0) {
        toast.warning(
          t('deletePartial', {
            succeeded: result.succeeded.length,
            failed: result.failed.length,
          }),
        );
      }
    },
  });

  return {
    nodesQuery,
    mutations: {
      create,
      update,
      setLifecycle,
      setEligibility,
      drain,
      drainCancel,
      delete: deleteNode,
      bulkDelete,
    },
  };
}

export type UseDataReturn = ReturnType<typeof useData>;
