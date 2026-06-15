import type { PluginManifest } from '@qlm/shell-contracts/manifest';

export const manifest: PluginManifest = {
  id: 'studio',
  version: '0.1.0',
  displayName: 'Studio',
  description: 'Docs CMS studio',
  icon: 'FileText',
  layer: 'project',
  routeBase: 'studio',
  projectTopLevelAppBucketId: 'artefacts',
  nav: {
    slot: 'project.topLevelNav',
    primary: {
      label: 'Studio',
      icon: 'FileText',
      order: 0,
    },
  },
  enabled: true,
};
