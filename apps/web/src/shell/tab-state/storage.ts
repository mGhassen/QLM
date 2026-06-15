import type { ShellTabStored, ShellTabGroup } from './types';

export function tabsStorageKey(projectId: string): string {
  return `guepard:project-tabs:${projectId}`;
}

export function groupsStorageKey(projectId: string): string {
  return `guepard:project-tab-groups:${projectId}`;
}

export function mruStorageKey(projectId: string): string {
  return `guepard:project-tab-mru:${projectId}`;
}

export function previewStorageKey(projectId: string): string {
  return `guepard:project-tab-preview:${projectId}`;
}

// One-shot purge: stale hrefs from before RFC-0028 make tab-switching look frozen.
const PURGE_FLAG_KEY = 'guepard:project-tabs:rfc28-purged';
export function purgeStaleProjectTabsOnce(): void {
  try {
    if (localStorage.getItem(PURGE_FLAG_KEY) === '1') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('guepard:project-tabs:') && key !== PURGE_FLAG_KEY) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(PURGE_FLAG_KEY, '1');
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export function normalizeHref(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    url.searchParams.sort();
    return url.pathname + (url.search === '?' ? '' : url.search);
  } catch {
    return href;
  }
}

export function loadTabs(projectId: string): ShellTabStored[] {
  try {
    const raw = localStorage.getItem(tabsStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const migrated = (parsed as ShellTabStored[]).map((tab) => {
      if (tab.id === 'nodes') {
        return {
          ...tab,
          id: 'infrastructure',
          href: tab.href.replace('/nodes', '/infrastructure'),
        };
      }
      if (
        typeof tab.href === 'string' &&
        /\/prj\/[^/]+\/nodes(\?|$)/.test(tab.href)
      ) {
        return {
          ...tab,
          href: tab.href.replace('/nodes', '/infrastructure'),
        };
      }
      return tab;
    });
    const byId = new Map<string, ShellTabStored>();
    for (const tab of migrated) byId.set(tab.id, tab);
    return Array.from(byId.values()).map((tab) => ({
      ...tab,
      href: normalizeHref(tab.href),
    }));
  } catch {
    return [];
  }
}

export function saveTabs(projectId: string, tabs: ShellTabStored[]): void {
  try {
    localStorage.setItem(tabsStorageKey(projectId), JSON.stringify(tabs));
  } catch {
    // ignore quota errors
  }
}

export function loadGroups(projectId: string): ShellTabGroup[] {
  try {
    const raw = localStorage.getItem(groupsStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ShellTabGroup[];
  } catch {
    return [];
  }
}

export function saveGroups(projectId: string, groups: ShellTabGroup[]): void {
  try {
    localStorage.setItem(groupsStorageKey(projectId), JSON.stringify(groups));
  } catch {
    // ignore quota errors
  }
}

export function loadMru(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(mruStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as string[];
  } catch {
    return [];
  }
}

export function saveMru(projectId: string, mru: string[]): void {
  try {
    localStorage.setItem(mruStorageKey(projectId), JSON.stringify(mru));
  } catch {
    // ignore quota errors
  }
}

export function loadPreview(projectId: string): string | null {
  try {
    const raw = localStorage.getItem(previewStorageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as string | null;
  } catch {
    return null;
  }
}

export function savePreview(projectId: string, id: string | null): void {
  try {
    localStorage.setItem(previewStorageKey(projectId), JSON.stringify(id));
  } catch {
    // ignore quota errors
  }
}
