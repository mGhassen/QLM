import { encodeTabId } from '@qlm/shell-contracts';

import type { Repositories } from '@qlm/domain/repositories';

/**
 * Flat-route project resolver for `/node/$nodeId`. The flat catch-all
 * (`apps/web/src/routes/$flatPrefix.$.tsx`) calls this to learn which
 * project the current URL refers to so it can mount the project shell.
 * Returns `null` for unknown ids — the host renders a not-found state.
 */
export async function resolveProjectContext(
  params: Record<string, string>,
  api: { repositories: Repositories },
): Promise<{ projectId: string; tabId: string } | null> {
  const id = params.nodeId;
  if (!id) return null;
  const node = await api.repositories.node.findById(id);
  if (!node) return null;
  return {
    projectId: node.projectId,
    tabId: encodeTabId({ kind: 'node-name', name: node.name }),
  };
}
