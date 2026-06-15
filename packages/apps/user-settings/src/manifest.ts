import type { PluginManifest } from '@guepard/shell-contracts/manifest';

export const manifest: PluginManifest = {
  id: 'user-settings',
  version: '0.1.0',
  displayName: 'User settings',
  description: 'Per-user settings (profile, personal tokens).',
  icon: 'UserCog',
  layer: 'project',
  routeBase: 'user-settings',
  projectTopLevelAppBucketId: 'user-settings',
  nav: {
    slot: 'project.overflow',
    primary: {
      label: 'User settings',
      icon: 'UserCog',
      order: 110,
    },
  },
  enabled: true,
};
