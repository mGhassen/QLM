import { createLayoutPrefsHook } from '@guepard/ui/create-layout-prefs-hook';

export type { DisplayMode } from '@guepard/ui/create-layout-prefs-hook';

export const useLayoutPrefs = createLayoutPrefsHook({
  storeKey: 'guepard:nodes',
  version: 8,
  defaultPinnedQuickFilters: ['status'],
});
