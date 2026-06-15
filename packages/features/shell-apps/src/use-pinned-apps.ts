import { useCallback, useState } from 'react';

import {
  readPinnedAppIds,
  togglePinnedAppId,
  writePinnedAppIds,
} from './pinned-apps-storage';

export function usePinnedApps(projectId: string) {
  const [pinnedIds, setPinnedIds] = useState(() => readPinnedAppIds(projectId));

  const isPinned = useCallback(
    (appId: string) => pinnedIds.includes(appId),
    [pinnedIds],
  );

  const togglePin = useCallback(
    (appId: string) => {
      setPinnedIds((current) => togglePinnedAppId(projectId, appId, current));
    },
    [projectId],
  );

  const setPinned = useCallback(
    (appIds: string[]) => {
      writePinnedAppIds(projectId, appIds);
      setPinnedIds(appIds);
    },
    [projectId],
  );

  return { pinnedIds, isPinned, togglePin, setPinned };
}
