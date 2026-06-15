import { encodeTabId } from '@guepard/shell-contracts';

import type { Repositories } from '@guepard/domain/repositories';

export async function resolveProjectContext(
  params: Record<string, string>,
  api: { repositories: Repositories },
): Promise<{ projectId: string; tabId: string } | null> {
  const id = params.id;
  if (!id) return null;
  const db = await api.repositories.database.findById(id);
  if (!db) return null;
  return {
    projectId: db.accountId,
    tabId: encodeTabId({ kind: 'database-name', name: db.name }),
  };
}
