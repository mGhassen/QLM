import type { ReactNode } from 'react';

/**
 * Public type for a single settings-dialog section. The shell is i18n-agnostic
 * — `label` is the resolved display string (the parent calls `t(...)`).
 *
 * Why `key` is a plain `string` and not a branded type: every consumer keeps
 * their own union of valid keys (e.g. apps/web has `'personal-tokens'` for
 * phase 1), and a branded string would force every consumer to import a
 * widening helper. The cost of a typo here is the wrong section showing —
 * obvious in the UI and caught by Storybook.
 */
export type SettingsSectionKey = string;

export type SettingsSection = {
  key: SettingsSectionKey;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
};
