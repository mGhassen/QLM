import { createLayoutPrefsHook } from '@qlm/ui/create-layout-prefs-hook';

export type { DisplayMode } from '@qlm/ui/create-layout-prefs-hook';

export const useLayoutPrefs = createLayoutPrefsHook({
  storeKey: 'qlm:nodes',
  version: 8,
  defaultPinnedQuickFilters: ['status'],
});
