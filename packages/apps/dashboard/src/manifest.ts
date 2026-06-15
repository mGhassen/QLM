import type { PluginManifest } from '@guepard/shell-contracts/manifest';

export const manifest: PluginManifest = {
  id: 'dashboard',
  version: '0.1.0',
  displayName: 'Dashboard',
  description: 'Project dashboard overview',
  icon: 'LayoutDashboard',
  layer: 'project',
  routeBase: 'dashboard',
  projectTopLevelAppBucketId: 'dashboard',
  nav: {
    slot: 'project.topLevelNav',
    primary: {
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      order: 0,
    },
  },
  enabled: true,
};
