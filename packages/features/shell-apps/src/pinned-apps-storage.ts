const STORAGE_KEY = 'guepard:pinned-app-ids';

export const DEFAULT_PINNED_APP_IDS = ['studio'] as const;

type PinnedAppsByProject = Record<string, string[]>;

function readAll(): PinnedAppsByProject {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PinnedAppsByProject;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: PinnedAppsByProject) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readPinnedAppIds(projectId: string): string[] {
  const stored = readAll()[projectId];
  if (stored && stored.length > 0) {
    return stored;
  }
  return [...DEFAULT_PINNED_APP_IDS];
}

export function writePinnedAppIds(projectId: string, appIds: string[]) {
  const all = readAll();
  all[projectId] = appIds;
  writeAll(all);
}

export function togglePinnedAppId(
  projectId: string,
  appId: string,
  current: string[],
): string[] {
  const next = current.includes(appId)
    ? current.filter((id) => id !== appId)
    : [...current, appId];
  writePinnedAppIds(projectId, next);
  return next;
}
