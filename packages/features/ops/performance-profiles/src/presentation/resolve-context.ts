import { encodeTabId } from '@guepard/shell-contracts';

import type { Repositories } from '@guepard/domain/repositories';

export async function resolveProjectContext(
  params: Record<string, string>,
  api: { repositories: Repositories },
): Promise<{ projectId: string; tabId: string } | null> {
  const id = params.id;
  if (!id) return null;
  const profile = await api.repositories.performanceProfile.findById(id);
  if (!profile?.accountId) return null;
  return {
    projectId: profile.accountId,
    tabId: encodeTabId({ kind: 'performance-profile-name', name: profile.labelName }),
  };
}
