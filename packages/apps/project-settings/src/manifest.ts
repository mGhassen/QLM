import type { PluginManifest } from '@qlm/shell-contracts/manifest';

export const manifest: PluginManifest = {
  id: 'project-settings',
  version: '0.1.0',
  displayName: 'Project settings',
  description: 'Project-scoped configuration sections.',
  icon: 'Settings',
  layer: 'project',
  routeBase: 'project-settings',
  projectTopLevelAppBucketId: 'project-settings',
  nav: {
    slot: 'project.overflow',
    primary: {
      label: 'Project settings',
      icon: 'Settings',
      order: 100,
    },
  },
  enabled: true,
};
