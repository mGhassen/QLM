import type { PluginManifest } from '@qlm/shell-contracts/manifest';

export const manifest: PluginManifest = {
  id: 'org-settings',
  version: '0.1.0',
  displayName: 'Organization settings',
  description: 'Organization-scoped configuration sections.',
  icon: 'Building2',
  layer: 'project',
  routeBase: 'org-settings',
  projectTopLevelAppBucketId: 'project-settings',
  nav: {
    slot: 'project.overflow',
    primary: {
      label: 'Organization settings',
      icon: 'Building2',
      order: 110,
    },
  },
  enabled: true,
};
