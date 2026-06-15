export type { ShellTabStored, ShellTabGroup, TabGroupColor } from './types';
export type { TabStateResult, VirtualTab } from './use-tab-state';
export { useTabState } from './use-tab-state';
export {
  TabStateContext,
  useTabStateContext,
  type TabStateContextValue,
} from './context';
export {
  normalizeHref,
  purgeStaleProjectTabsOnce,
  loadTabs,
  saveTabs,
  loadGroups,
  saveGroups,
  tabsStorageKey,
  groupsStorageKey,
} from './storage';
