import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { nanoid } from 'nanoid';

import { createProjectAppPath } from '@/config/paths.config';
import { getAppRegistry } from '@/shell/app-registry';

import type { ShellTabGroup, ShellTabStored, TabGroupColor } from './types';
import {
  loadGroups,
  loadMru,
  loadPreview,
  loadTabs,
  normalizeHref,
  saveGroups,
  saveMru,
  savePreview,
  saveTabs,
} from './storage';

const registry = getAppRegistry();

// Carries original list index so reopen restores the tab to its old position.
type ClosedEntry = ShellTabStored & { _idx?: number };

export type VirtualTab = {
  id: string;
  title: string;
  href: string;
};

export type TabStateResult = {
  openTabs: ShellTabStored[];
  tabGroups: ShellTabGroup[];
  closedTabsHistory: ShellTabStored[];
  mru: string[];
  previewTabId: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  setOpenTabs: React.Dispatch<React.SetStateAction<ShellTabStored[]>>;
  // Navigation handlers
  handleItemClick: (itemId: string, newTab: boolean) => void;
  handleTabClick: (tabId: string) => void;
  handleTabClose: (tabId: string) => void;
  handleTabPin: (tabId: string) => void;
  handleTabReorder: (activeId: string, overId: string) => void;
  handleReloadTab: (tabId: string) => void;
  handleReopenClosedTab: () => void;
  handleNavBack: () => void;
  handleNavForward: () => void;
  handleCloseOthers: (tabId: string) => void;
  handleCloseToRight: (tabId: string) => void;
  handleCloseToLeft: (tabId: string) => void;
  handleNewTab: () => void;
  // Group handlers
  handleCreateGroup: (
    tabIds: string[],
    title?: string,
    color?: TabGroupColor,
  ) => string;
  handleRenameGroup: (groupId: string, title: string) => void;
  handleSetGroupColor: (groupId: string, color: TabGroupColor) => void;
  handleCollapseGroup: (groupId: string, collapsed: boolean) => void;
  handleUngroupAll: (groupId: string) => void;
  handleAddToGroup: (tabId: string, groupId: string) => void;
  handleRemoveFromGroup: (tabId: string) => void;
  handleReorderGroup: (groupId: string, overId: string) => void;
  handleCloseGroup: (groupId: string) => void;
  handleCloseGroupPreservePinned: (groupId: string) => void;
  handlePinGroup: (groupId: string) => void;
  // Global bar actions
  handleCloseAllTabs: () => void;
  handlePinAllTabs: () => void;
  handleUnpinAllTabs: () => void;
  // New-tab page helpers
  replaceNewTab: (routeBase: string) => void;
  openInBackground: (routeBase: string) => void;
};

function parseRouteBaseFromPathname(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const prjIdx = segments.indexOf('prj');
  if (prjIdx !== -1) return segments[prjIdx + 2];
  if (segments[0] === 'agent') return 'agent';
  if (segments.length > 0) {
    const entry = registry.getByFlatPrefix(segments[0]!);
    if (entry) return entry.manifest.routeBase;
  }
  return undefined;
}

/**
 * Ensures all tabs belonging to the same group are contiguous.
 * Groups appear in the order of their first member in the current array.
 * Ungrouped tabs keep their relative positions.
 * Orphaned groupIds (group no longer in tabGroups) are stripped.
 */
function normalizeTabOrder(
  tabs: ShellTabStored[],
  groups: ShellTabGroup[],
): ShellTabStored[] {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const tabById = new Map(tabs.map((t) => [t.id, t]));
  const placedGroups = new Set<string>();
  const result: ShellTabStored[] = [];

  for (const tab of tabs) {
    if (!tab.groupId) {
      result.push(tab);
      continue;
    }
    const group = groupById.get(tab.groupId);
    if (!group) {
      result.push({ ...tab, groupId: undefined });
      continue;
    }
    if (!placedGroups.has(tab.groupId)) {
      placedGroups.add(tab.groupId);
      for (const memberId of group.tabIds) {
        const memberTab = tabById.get(memberId);
        if (memberTab) result.push(memberTab);
      }
    }
  }

  return result;
}

function pushMru(prev: string[], id: string): string[] {
  return [id, ...prev.filter((x) => x !== id)];
}

function removeMru(prev: string[], id: string): string[] {
  return prev.filter((x) => x !== id);
}

export function useTabState(params: {
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  activeTabId: string;
  virtualTab?: VirtualTab;
}): TabStateResult {
  const { projectId, projectSlug, orgSlug, activeTabId, virtualTab } = params;

  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();

  const [openTabs, setOpenTabs] = useState<ShellTabStored[]>(() =>
    loadTabs(projectId),
  );
  const [tabGroups, setTabGroups] = useState<ShellTabGroup[]>(() =>
    loadGroups(projectId),
  );
  const [closedTabsHistory, setClosedTabsHistory] = useState<ClosedEntry[]>([]);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [mru, setMru] = useState<string[]>(() => loadMru(projectId));
  const [previewTabId, setPreviewTabId] = useState<string | null>(() =>
    loadPreview(projectId),
  );

  // Navigation history (refs avoid stale-closure bugs; derived state for reactivity)
  const navHistoryRef = useRef<string[]>([]);
  const navHistoryIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  function syncNavButtons() {
    setCanGoBack(navHistoryIdxRef.current > 0);
    setCanGoForward(
      navHistoryIdxRef.current < navHistoryRef.current.length - 1,
    );
  }

  // Keep mru[0] === activeTabId always (VS Code invariant S4).
  // "Store info from previous render" — push during render when activeTabId changes.
  const [prevActiveForMru, setPrevActiveForMru] = useState<string | null>(null);
  if (prevActiveForMru !== activeTabId) {
    setPrevActiveForMru(activeTabId);
    setMru((prev) => pushMru(prev, activeTabId));
  }

  // Track tab navigation into history stack
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      syncNavButtons();
      return;
    }
    const newHistory = navHistoryRef.current.slice(
      0,
      navHistoryIdxRef.current + 1,
    );
    newHistory.push(activeTabId);
    navHistoryRef.current = newHistory;
    navHistoryIdxRef.current = newHistory.length - 1;
    syncNavButtons();
  }, [activeTabId]);

  // Ensure virtual tab record exists (membership only, no href update here).
  // "Store info from previous render" — sync on virtualTab identity/title/href change.
  const virtualTabKey = virtualTab
    ? `${virtualTab.id}|${virtualTab.title}|${virtualTab.href}`
    : '';
  const [prevVirtualTabKey, setPrevVirtualTabKey] = useState('');
  if (prevVirtualTabKey !== virtualTabKey) {
    setPrevVirtualTabKey(virtualTabKey);
    if (virtualTab) {
      setOpenTabs((prev) => {
        const existing = prev.find((t) => t.id === virtualTab.id);
        if (existing) {
          if (existing.title === virtualTab.title) return prev;
          return prev.map((t) =>
            t.id === virtualTab.id ? { ...t, title: virtualTab.title } : t,
          );
        }
        return [
          ...prev,
          {
            id: virtualTab.id,
            title: virtualTab.title,
            href: normalizeHref(virtualTab.href),
            virtual: true,
          },
        ];
      });
    }
  }

  // Ensure contextual tab record exists (membership only).
  // "Store info from previous render" — sync on path/projectSlug change.
  const contextualKey = `${location.pathname}|${projectSlug}`;
  const [prevContextualKey, setPrevContextualKey] = useState('');
  if (prevContextualKey !== contextualKey) {
    setPrevContextualKey(contextualKey);
    const routeBase = parseRouteBaseFromPathname(location.pathname);
    const entry = routeBase ? registry.getByRouteBase(routeBase) : undefined;
    if (routeBase && entry) {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === routeBase)) return prev;
        return [
          ...prev,
          {
            id: routeBase,
            title: entry.manifest.displayName,
            href: createProjectAppPath(projectSlug, routeBase),
          },
        ];
      });
    }
  }

  // Fire pending navigation after state settles.
  // "Store info from previous render" — drain the latch in render, dispatch in effect.
  const [drainedNav, setDrainedNav] = useState<string | null>(null);
  if (pendingNav && pendingNav !== drainedNav) {
    setDrainedNav(pendingNav);
    setPendingNav(null);
  }
  useEffect(() => {
    if (!drainedNav) return;
    void navigate({ href: drainedNav });
  }, [drainedNav, navigate]);

  useEffect(() => {
    saveTabs(projectId, openTabs);
  }, [projectId, openTabs]);

  useEffect(() => {
    saveGroups(projectId, tabGroups);
  }, [projectId, tabGroups]);

  useEffect(() => {
    saveMru(projectId, mru);
  }, [projectId, mru]);

  useEffect(() => {
    savePreview(projectId, previewTabId);
  }, [projectId, previewTabId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'qlm:last-project-slug',
        JSON.stringify({ orgSlug, projectSlug }),
      );
    } catch {
      // ignore
    }
  }, [orgSlug, projectSlug]);

  // ── Navigation handlers ───────────────────────────────────────────────

  const handleItemClick = useCallback(
    (itemId: string, newTab: boolean) => {
      const entry =
        registry.getByRouteBase(itemId) ?? registry.getByManifestId(itemId);
      if (!entry) return;

      const existing = openTabs.find((t) => t.id === entry.manifest.routeBase);

      // Save current tab href before leaving
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, href: normalizeHref(location.href) }
            : t,
        ),
      );

      if (existing) {
        // Tab already open — just navigate to it
        void navigate({ href: existing.href });
        return;
      }

      if (newTab) {
        // Explicit "open in new tab" — open as permanent (non-preview)
        const href = createProjectAppPath(
          projectSlug,
          entry.manifest.routeBase,
        );
        setOpenTabs((prev) => [
          ...prev,
          {
            id: entry.manifest.routeBase,
            title: entry.manifest.displayName,
            href,
          },
        ]);
        void navigate({ href });
        return;
      }

      // Sidebar click — open as preview (replace existing preview if any)
      if (previewTabId && previewTabId !== entry.manifest.routeBase) {
        setOpenTabs((prev) => prev.filter((t) => t.id !== previewTabId));
        setMru((prev) => removeMru(prev, previewTabId));
      }
      const href = createProjectAppPath(projectSlug, entry.manifest.routeBase);
      setOpenTabs((prev) =>
        prev.some((t) => t.id === entry.manifest.routeBase)
          ? prev
          : [
              ...prev,
              {
                id: entry.manifest.routeBase,
                title: entry.manifest.displayName,
                href,
              },
            ],
      );
      setPreviewTabId(entry.manifest.routeBase);
      void navigate({ href });
    },
    [projectSlug, navigate, openTabs, activeTabId, location.href, previewTabId],
  );

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return;
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab) return;
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, href: normalizeHref(location.href) }
            : t,
        ),
      );
      void navigate({ href: tab.href });
    },
    [activeTabId, openTabs, navigate, location.href],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      let fallbackHref: string | null = null;
      let closedTab: ClosedEntry | null = null;
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1 || prev.length <= 1) return prev;
        closedTab = { ...prev[idx]!, _idx: idx };
        const next = prev.filter((t) => t.id !== tabId);
        if (tabId === activeTabId) {
          // MRU-based close-next (VS Code focusRecentEditorAfterClose behavior)
          const nextActiveId = mru.find(
            (id) => id !== tabId && next.some((t) => t.id === id),
          );
          const fallback =
            next.find((t) => t.id === nextActiveId) ??
            next[idx] ??
            next[idx - 1] ??
            next[0];
          if (fallback) fallbackHref = fallback.href;
        }
        return next;
      });
      setMru((prev) => removeMru(prev, tabId));
      if (tabId === previewTabId) setPreviewTabId(null);
      if (closedTab !== null) {
        const cc: ClosedEntry = closedTab!;
        setClosedTabsHistory((h) => [...h.slice(-9), cc]);
        if (cc.groupId) {
          const gid = cc.groupId;
          const cid = cc.id;
          setTabGroups((prev) => {
            const updated = prev.map((g) =>
              g.id === gid
                ? { ...g, tabIds: g.tabIds.filter((id) => id !== cid) }
                : g,
            );
            return updated.filter((g) => g.tabIds.length > 0);
          });
        }
      }
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [activeTabId, mru, previewTabId],
  );

  const handleTabPin = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (t.groupId) {
            const gid = t.groupId;
            const nowPinned = !t.pinned;
            // Keep the tab in its group; move to front of group's tabIds list
            setTabGroups((gs) =>
              gs.map((g) => {
                if (g.id !== gid) return g;
                const without = g.tabIds.filter((id) => id !== tabId);
                return { ...g, tabIds: [tabId, ...without] };
              }),
            );
            // Also reorder in openTabs: move tab to just before the first sibling in openTabs
            // (handled by the group ordering logic; just toggle pin here)
            return { ...t, pinned: nowPinned };
          }
          return { ...t, pinned: !t.pinned };
        }),
      );
      if (tabId === previewTabId) setPreviewTabId(null);
    },
    [previewTabId],
  );

  const handleTabReorder = useCallback((activeId: string, overId: string) => {
    setOpenTabs((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved!);
      return next;
    });
    setTabGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (!g.tabIds.includes(activeId) || !g.tabIds.includes(overId))
          return g;
        const oldIdx = g.tabIds.indexOf(activeId);
        const newIdx = g.tabIds.indexOf(overId);
        const newTabIds = [...g.tabIds];
        const [moved] = newTabIds.splice(oldIdx, 1);
        newTabIds.splice(newIdx, 0, moved!);
        return { ...g, tabIds: newTabIds };
      }),
    );
  }, []);

  const handleReloadTab = useCallback(
    (tabId: string) => {
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab) return;
      if (tabId === activeTabId) {
        void router.invalidate();
      } else {
        void navigate({ href: tab.href });
      }
    },
    [openTabs, activeTabId, navigate, router],
  );

  const handleReopenClosedTab = useCallback(() => {
    if (closedTabsHistory.length === 0) return;
    const entry = closedTabsHistory[closedTabsHistory.length - 1]!;
    setClosedTabsHistory((prev) => prev.slice(0, -1));
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === entry.id)) return prev;
      const { _idx: originalIdx, ...tab } = entry;
      const restoredTab =
        tab.groupId && tabGroups.some((g) => g.id === tab.groupId)
          ? tab
          : { ...tab, groupId: undefined };
      const insertAt =
        originalIdx != null ? Math.min(originalIdx, prev.length) : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, restoredTab);
      return next;
    });
    if (entry.groupId && tabGroups.some((g) => g.id === entry.groupId)) {
      setTabGroups((prev) =>
        prev.map((g) =>
          g.id === entry.groupId
            ? { ...g, tabIds: [...g.tabIds, entry.id] }
            : g,
        ),
      );
    }
    setPendingNav(entry.href);
  }, [closedTabsHistory, tabGroups]);

  const handleNavBack = useCallback(() => {
    const idx = navHistoryIdxRef.current;
    if (idx <= 0) return;
    const prevTabId = navHistoryRef.current[idx - 1];
    if (!prevTabId) return;
    const tab = openTabs.find((t) => t.id === prevTabId);
    if (!tab) {
      navHistoryIdxRef.current = idx - 1;
      syncNavButtons();
      return;
    }
    navHistoryIdxRef.current = idx - 1;
    skipHistoryRef.current = true;
    void navigate({ href: tab.href });
  }, [openTabs, navigate]);

  const handleNavForward = useCallback(() => {
    const idx = navHistoryIdxRef.current;
    if (idx >= navHistoryRef.current.length - 1) return;
    const nextTabId = navHistoryRef.current[idx + 1];
    if (!nextTabId) return;
    const tab = openTabs.find((t) => t.id === nextTabId);
    if (!tab) {
      navHistoryIdxRef.current = idx + 1;
      syncNavButtons();
      return;
    }
    navHistoryIdxRef.current = idx + 1;
    skipHistoryRef.current = true;
    void navigate({ href: tab.href });
  }, [openTabs, navigate]);

  const handleCloseOthers = useCallback(
    (tabId: string) => {
      let fallbackHref: string | null = null;
      let removedIds: string[] = [];
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.pinned || t.id === tabId);
        if (next.length === 0) return prev;
        removedIds = prev
          .filter((t) => !t.pinned && t.id !== tabId)
          .map((t) => t.id);
        if (activeTabId !== tabId && !next.some((t) => t.id === activeTabId)) {
          const target = next.find((t) => t.id === tabId) ?? next[0];
          if (target) fallbackHref = target.href;
        }
        return next;
      });
      if (removedIds.length > 0) {
        setMru((prev) => prev.filter((id) => !removedIds.includes(id)));
        if (previewTabId && removedIds.includes(previewTabId)) {
          setPreviewTabId(null);
        }
      }
      setTabGroups((prev) =>
        prev
          .map((g) => ({ ...g, tabIds: g.tabIds.filter((id) => id === tabId) }))
          .filter((g) => g.tabIds.length > 0),
      );
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [activeTabId, previewTabId],
  );

  const handleCloseToRight = useCallback(
    (tabId: string) => {
      let fallbackHref: string | null = null;
      let removedIds: string[] = [];
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1) return prev;
        const next = prev.filter((t, i) => t.pinned || i <= idx);
        removedIds = prev
          .filter((t, i) => !t.pinned && i > idx)
          .map((t) => t.id);
        if (!next.some((t) => t.id === activeTabId)) {
          const target = next[next.length - 1];
          if (target) fallbackHref = target.href;
        }
        return next;
      });
      if (removedIds.length > 0) {
        setMru((prev) => prev.filter((id) => !removedIds.includes(id)));
        if (previewTabId && removedIds.includes(previewTabId)) {
          setPreviewTabId(null);
        }
        setTabGroups((prev) =>
          prev
            .map((g) => ({
              ...g,
              tabIds: g.tabIds.filter((id) => !removedIds.includes(id)),
            }))
            .filter((g) => g.tabIds.length > 0),
        );
      }
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [activeTabId, previewTabId],
  );

  const handleCloseToLeft = useCallback(
    (tabId: string) => {
      let fallbackHref: string | null = null;
      let removedIds: string[] = [];
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1) return prev;
        const next = prev.filter((t, i) => t.pinned || i >= idx);
        removedIds = prev
          .filter((t, i) => !t.pinned && i < idx)
          .map((t) => t.id);
        if (!next.some((t) => t.id === activeTabId)) {
          const target = next[0];
          if (target) fallbackHref = target.href;
        }
        return next;
      });
      if (removedIds.length > 0) {
        setMru((prev) => prev.filter((id) => !removedIds.includes(id)));
        if (previewTabId && removedIds.includes(previewTabId)) {
          setPreviewTabId(null);
        }
        setTabGroups((prev) =>
          prev
            .map((g) => ({
              ...g,
              tabIds: g.tabIds.filter((id) => !removedIds.includes(id)),
            }))
            .filter((g) => g.tabIds.length > 0),
        );
      }
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [activeTabId, previewTabId],
  );

  const handleNewTab = useCallback(() => {
    const existing = openTabs.find((t) => t.id === 'new-tab');
    if (existing && activeTabId !== 'new-tab') {
      void navigate({ href: existing.href });
      return;
    }
    void navigate({ to: `/prj/${projectSlug}/new-tab` });
  }, [navigate, projectSlug, openTabs, activeTabId]);

  // ── Group handlers ─────────────────────────────────────────────────────

  const handleCreateGroup = useCallback(
    (tabIds: string[], title?: string, color?: TabGroupColor): string => {
      const validIds = tabIds.filter((id) => {
        const tab = openTabs.find((t) => t.id === id);
        return tab && !tab.pinned;
      });
      if (validIds.length < 1) return '';

      const newGroupId = nanoid();

      const newGroups: ShellTabGroup[] = [
        ...tabGroups
          .map((g) => ({
            ...g,
            tabIds: g.tabIds.filter((id) => !validIds.includes(id)),
          }))
          .filter((g) => g.tabIds.length > 0),
        {
          id: newGroupId,
          title: title ?? '',
          color: color ?? 'grey',
          collapsed: false,
          tabIds: validIds,
        },
      ];

      const newTabs = openTabs.map((t) => ({
        ...t,
        groupId: validIds.includes(t.id) ? newGroupId : t.groupId,
      }));

      const groupById = new Map(newGroups.map((g) => [g.id, g]));
      const resolvedTabs = newTabs.map((t) => {
        if (!t.groupId) return t;
        const g = groupById.get(t.groupId);
        if (!g || !g.tabIds.includes(t.id)) return { ...t, groupId: undefined };
        return t;
      });

      setTabGroups(newGroups);
      setOpenTabs(normalizeTabOrder(resolvedTabs, newGroups));
      return newGroupId;
    },
    [openTabs, tabGroups],
  );

  const handleRenameGroup = useCallback((groupId: string, title: string) => {
    setTabGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, title } : g)),
    );
  }, []);

  const handleSetGroupColor = useCallback(
    (groupId: string, color: TabGroupColor) => {
      setTabGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, color } : g)),
      );
    },
    [],
  );

  const handleCollapseGroup = useCallback(
    (groupId: string, collapsed: boolean) => {
      setTabGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, collapsed } : g)),
      );
      if (collapsed) {
        const group = tabGroups.find((g) => g.id === groupId);
        if (group?.tabIds.includes(activeTabId)) {
          const firstOutside = openTabs.find(
            (t) => !t.groupId || t.groupId !== groupId,
          );
          if (firstOutside) setPendingNav(firstOutside.href);
        }
      }
    },
    [tabGroups, activeTabId, openTabs],
  );

  const handleUngroupAll = useCallback((groupId: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.groupId === groupId ? { ...t, groupId: undefined } : t,
      ),
    );
    setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const handleAddToGroup = useCallback(
    (tabId: string, groupId: string) => {
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab || tab.pinned) return;

      const oldGroupId = tab.groupId;
      const newGroups = tabGroups
        .map((g) => {
          if (g.id === oldGroupId) {
            return { ...g, tabIds: g.tabIds.filter((id) => id !== tabId) };
          }
          if (g.id === groupId) {
            if (g.tabIds.includes(tabId)) return g;
            return { ...g, tabIds: [...g.tabIds, tabId] };
          }
          return g;
        })
        .filter((g) => g.tabIds.length > 0);

      const newTabs = openTabs.map((t) =>
        t.id === tabId ? { ...t, groupId } : t,
      );

      setTabGroups(newGroups);
      setOpenTabs(normalizeTabOrder(newTabs, newGroups));
    },
    [openTabs, tabGroups],
  );

  const handleRemoveFromGroup = useCallback(
    (tabId: string) => {
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab?.groupId) return;

      const gid = tab.groupId;
      const newGroups = tabGroups
        .map((g) =>
          g.id === gid
            ? { ...g, tabIds: g.tabIds.filter((id) => id !== tabId) }
            : g,
        )
        .filter((g) => g.tabIds.length > 0);

      const remainingGroupTabIds = new Set(
        (tabGroups.find((g) => g.id === gid)?.tabIds ?? []).filter(
          (id) => id !== tabId,
        ),
      );

      setTabGroups(newGroups);
      setOpenTabs((prev) => {
        // Remove tab from its current position
        const without = prev.filter((t) => t.id !== tabId);
        // Find last remaining group member's position in the reduced list
        const lastGroupMemberIdx = without.reduce(
          (best, t, idx) => (remainingGroupTabIds.has(t.id) ? idx : best),
          -1,
        );
        // Insert right after the group; if no members left, keep at original position
        const insertAt =
          lastGroupMemberIdx >= 0 ? lastGroupMemberIdx + 1 : without.length;
        const next = [...without];
        next.splice(insertAt, 0, { ...tab, groupId: undefined });
        return next;
      });
    },
    [openTabs, tabGroups],
  );

  const handleReorderGroup = useCallback(
    (groupId: string, overId: string) => {
      setOpenTabs((prev) => {
        const group = tabGroups.find((g) => g.id === groupId);
        if (!group) return prev;

        const memberIds = new Set(group.tabIds);
        const groupTabs = group.tabIds
          .map((id) => prev.find((t) => t.id === id))
          .filter(Boolean) as ShellTabStored[];

        const groupStartInPrev = prev.findIndex((t) => memberIds.has(t.id));

        let resolvedOverId = overId;
        if (overId.startsWith('group:')) {
          const overGroupId = overId.slice('group:'.length);
          const overGroup = tabGroups.find((g) => g.id === overGroupId);
          if (overGroup) {
            const overGroupStartInPrev = prev.findIndex(
              (t) => t.id === overGroup.tabIds[0],
            );
            const movingRight = overGroupStartInPrev > groupStartInPrev;
            resolvedOverId = movingRight
              ? (overGroup.tabIds[overGroup.tabIds.length - 1] ??
                overGroup.tabIds[0]!)
              : overGroup.tabIds[0]!;
          }
        }

        const withoutGroup = prev.filter((t) => !memberIds.has(t.id));
        const overInPrev = prev.findIndex((t) => t.id === resolvedOverId);
        const movingRight =
          groupStartInPrev !== -1 && overInPrev > groupStartInPrev;
        const overIdxInWithout = withoutGroup.findIndex(
          (t) => t.id === resolvedOverId,
        );

        const insertAt =
          overIdxInWithout === -1
            ? withoutGroup.length
            : movingRight
              ? overIdxInWithout + 1
              : overIdxInWithout;

        const result = [...withoutGroup];
        result.splice(insertAt, 0, ...groupTabs);
        return result;
      });
    },
    [tabGroups],
  );

  const handleCloseGroup = useCallback(
    (groupId: string) => {
      const group = tabGroups.find((g) => g.id === groupId);
      if (!group) return;

      let fallbackHref: string | null = null;
      const memberIds = new Set(group.tabIds);

      setOpenTabs((prev) => {
        const closed = prev.filter((t) => memberIds.has(t.id));
        setClosedTabsHistory((h) => [
          ...h.slice(-(10 - closed.length)),
          ...closed,
        ]);

        const next = prev.filter((t) => !memberIds.has(t.id));
        if (memberIds.has(activeTabId)) {
          const fallback = next[0];
          if (fallback) fallbackHref = fallback.href;
        }
        return next;
      });
      setMru((prev) => prev.filter((id) => !memberIds.has(id)));
      if (previewTabId && memberIds.has(previewTabId)) setPreviewTabId(null);
      setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [tabGroups, activeTabId, previewTabId],
  );

  const handleCloseGroupPreservePinned = useCallback(
    (groupId: string) => {
      const group = tabGroups.find((g) => g.id === groupId);
      if (!group) return;

      let fallbackHref: string | null = null;
      const memberIds = new Set(group.tabIds);

      setOpenTabs((prev) => {
        const pinnedMembers = prev.filter(
          (t) => memberIds.has(t.id) && t.pinned,
        );
        const unpinnedMembers = prev.filter(
          (t) => memberIds.has(t.id) && !t.pinned,
        );
        const lastMemberIdx = prev.reduce(
          (best, t, idx) => (memberIds.has(t.id) ? idx : best),
          -1,
        );
        // Remove unpinned group members
        const without = prev.filter((t) => !memberIds.has(t.id) || t.pinned);
        // Move pinned members out of group (clear groupId), placed right after where group was
        const pinnedWithoutGroup = pinnedMembers.map((t) => ({
          ...t,
          groupId: undefined,
        }));
        const insertAt = without.reduce(
          (best, t, idx) => {
            const origIdx = prev.indexOf(t);
            return origIdx <= lastMemberIdx ? idx + 1 : best;
          },
          lastMemberIdx === -1 ? without.length : 0,
        );
        const result = [
          ...without.filter((t) => !t.pinned || !memberIds.has(t.id)),
        ];
        result.splice(insertAt, 0, ...pinnedWithoutGroup);
        if (
          memberIds.has(activeTabId) &&
          !prev.find((t) => t.id === activeTabId)?.pinned
        ) {
          const fallback = result[0];
          if (fallback) fallbackHref = fallback.href;
        }
        void unpinnedMembers; // consumed via filter
        return result;
      });
      setMru((prev) => {
        const unpinnedIds = new Set(
          (tabGroups.find((g) => g.id === groupId)?.tabIds ?? []).filter((id) =>
            openTabs.find((t) => t.id === id && !t.pinned),
          ),
        );
        return prev.filter((id) => !unpinnedIds.has(id));
      });
      if (previewTabId && memberIds.has(previewTabId)) setPreviewTabId(null);
      setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (fallbackHref) setPendingNav(fallbackHref);
    },
    [tabGroups, activeTabId, previewTabId, openTabs],
  );

  const handlePinGroup = useCallback(
    (groupId: string) => {
      const group = tabGroups.find((g) => g.id === groupId);
      if (!group) return;
      const memberIds = new Set(group.tabIds);
      setOpenTabs((prev) =>
        prev.map((t) =>
          memberIds.has(t.id) ? { ...t, pinned: true, groupId: undefined } : t,
        ),
      );
      if (previewTabId && memberIds.has(previewTabId)) setPreviewTabId(null);
      setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [tabGroups, previewTabId],
  );

  // ── Global tab bar actions ────────────────────────────────────────────

  const handleCloseAllTabs = useCallback(() => {
    let removedIds: string[] = [];
    setOpenTabs((prev) => {
      const pinned = prev.filter((t) => t.pinned);
      const unpinned = prev.filter((t) => !t.pinned);
      removedIds = unpinned.map((t) => t.id);
      setClosedTabsHistory((h) => [...unpinned, ...h].slice(0, 20));
      return pinned;
    });
    if (removedIds.length > 0) {
      setMru((prev) => prev.filter((id) => !removedIds.includes(id)));
      if (previewTabId && removedIds.includes(previewTabId)) {
        setPreviewTabId(null);
      }
    }
    setTabGroups([]);
  }, [previewTabId]);

  const handlePinAllTabs = useCallback(() => {
    setOpenTabs((prev) =>
      prev.map((t) => ({ ...t, pinned: true, groupId: undefined })),
    );
    setPreviewTabId(null);
    setTabGroups([]);
  }, []);

  const handleUnpinAllTabs = useCallback(() => {
    setOpenTabs((prev) => prev.map((t) => ({ ...t, pinned: false })));
  }, []);

  // ── New-tab page helpers ───────────────────────────────────────────────

  const replaceNewTab = useCallback(
    (routeBase: string) => {
      setOpenTabs((prev) => prev.filter((t) => t.id !== 'new-tab'));
      setMru((prev) => removeMru(prev, 'new-tab'));
      const entry = registry.getByRouteBase(routeBase);
      const href = createProjectAppPath(projectSlug, routeBase);
      const existing = openTabs.find((t) => t.id === routeBase);
      setPendingNav(existing?.href ?? href);
      if (!existing && entry) {
        setOpenTabs((prev) =>
          prev.some((t) => t.id === routeBase)
            ? prev
            : [
                ...prev,
                {
                  id: routeBase,
                  title: entry.manifest.displayName,
                  href,
                },
              ],
        );
      }
    },
    [projectSlug, openTabs],
  );

  const openInBackground = useCallback(
    (routeBase: string) => {
      if (openTabs.some((t) => t.id === routeBase)) return;
      const entry = registry.getByRouteBase(routeBase);
      if (!entry) return;
      const href = createProjectAppPath(projectSlug, routeBase);
      setOpenTabs((prev) => [
        ...prev,
        {
          id: routeBase,
          title: entry.manifest.displayName,
          href,
        },
      ]);
    },
    [projectSlug, openTabs],
  );

  return {
    openTabs,
    tabGroups,
    closedTabsHistory,
    mru,
    previewTabId,
    canGoBack,
    canGoForward,
    setOpenTabs,
    handleItemClick,
    handleTabClick,
    handleTabClose,
    handleTabPin,
    handleTabReorder,
    handleReloadTab,
    handleReopenClosedTab,
    handleNavBack,
    handleNavForward,
    handleCloseOthers,
    handleCloseToRight,
    handleCloseToLeft,
    handleNewTab,
    handleCreateGroup,
    handleRenameGroup,
    handleSetGroupColor,
    handleCollapseGroup,
    handleUngroupAll,
    handleAddToGroup,
    handleRemoveFromGroup,
    handleReorderGroup,
    handleCloseGroup,
    handleCloseGroupPreservePinned,
    handlePinGroup,
    handleCloseAllTabs,
    handlePinAllTabs,
    handleUnpinAllTabs,
    replaceNewTab,
    openInBackground,
  };
}
