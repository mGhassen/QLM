import type { ProjectShellBucketId } from './manifest';

/** One feature app row in the nav catalog. */
export interface ProjectNavFeatureApp {
  title: string;
  pathSuffix: string;
  /** Lucide icon name for display in sidebar. */
  icon?: string;
}

/** A group of feature apps under a bucket. */
export interface ProjectNavGroup {
  title: string;
  items: ProjectNavFeatureApp[];
}

/**
 * Top-level app bucket definition.
 * Icon is stored as a string key (lucide icon name) to keep this package React-free.
 */
export interface ProjectShellBucketDef {
  id: ProjectShellBucketId;
  label: string;
  /** Lucide icon name (e.g. "LayoutDashboard"). */
  icon: string;
  groups: ProjectNavGroup[];
}

/** Catalog of top-level app buckets and their groups / feature apps. */
export const PROJECT_SHELL_BUCKETS: ProjectShellBucketDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    groups: [
      {
        title: 'Overview',
        items: [{ title: 'Dashboard', pathSuffix: 'dashboard' }],
      },
    ],
  },
  {
    id: 'ops',
    label: 'Ops',
    icon: 'SquareTerminal',
    groups: [
      {
        title: 'Environments',
        items: [{ title: 'Environments', pathSuffix: 'environment' }],
      },
      {
        title: 'Infrastructure',
        items: [
          { title: 'Nodes', pathSuffix: 'nodes' },
          { title: 'Storage', pathSuffix: 'ops/infrastructure/storage' },
          { title: 'Compute', pathSuffix: 'ops/infrastructure/compute' },
        ],
      },
      {
        title: 'Monitoring',
        items: [
          { title: 'Monitoring', pathSuffix: 'ops/observability/monitoring' },
        ],
      },
      {
        title: 'Logs',
        items: [{ title: 'Logs', pathSuffix: 'ops/observability/logs' }],
      },
      {
        title: 'Telemetry',
        items: [
          { title: 'Telemetry', pathSuffix: 'ops/observability/telemetry' },
        ],
      },
      {
        title: 'Integrations',
        items: [{ title: 'Integrations', pathSuffix: 'integrations' }],
      },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    icon: 'Database',
    groups: [
      {
        title: 'Overview',
        items: [{ title: 'Databases', pathSuffix: 'databases' }],
      },
      {
        title: 'Branching',
        items: [
          { title: 'Snapshots', pathSuffix: 'database/branching/snapshots' },
          {
            title: 'Time travel',
            pathSuffix: 'database/branching/time-travel',
          },
        ],
      },
      {
        title: 'Management',
        items: [
          {
            title: 'Schema Visualizer',
            pathSuffix: 'database/management/schema-visualizer',
          },
          { title: 'Tables', pathSuffix: 'database/management/tables' },
          { title: 'Functions', pathSuffix: 'database/management/functions' },
          { title: 'Triggers', pathSuffix: 'database/management/triggers' },
          {
            title: 'Enumerated Types',
            pathSuffix: 'database/management/enums',
          },
          { title: 'Indexes', pathSuffix: 'database/management/indexes' },
        ],
      },
      {
        title: 'Configuration',
        items: [
          { title: 'Roles', pathSuffix: 'database/configuration/roles' },
          {
            title: 'Settings',
            pathSuffix: 'database/configuration/settings',
          },
        ],
      },
      {
        title: 'Platform',
        items: [{ title: 'Platform', pathSuffix: 'database/platform' }],
      },
      {
        title: 'Providers',
        items: [
          {
            title: 'Extensions',
            pathSuffix: 'database/providers/extensions',
          },
        ],
      },
    ],
  },
  {
    id: 'migration',
    label: 'Migration',
    icon: 'ArrowRightLeft',
    groups: [
      {
        title: 'Migration',
        items: [
          { title: 'Extract & Load', pathSuffix: 'migration/extract-load' },
          { title: 'Wrappers', pathSuffix: 'migration/wrappers' },
          { title: 'Replication', pathSuffix: 'migration/replication' },
          { title: 'Backups', pathSuffix: 'migration/backups' },
          { title: 'Tasks', pathSuffix: 'rml-tasks' },
        ],
      },
    ],
  },
  {
    id: 'advisory',
    label: 'Advisory',
    icon: 'Gauge',
    groups: [
      {
        title: 'Advisory',
        items: [
          {
            title: 'Performance profiles',
            pathSuffix: 'performance-profiles',
          },
          {
            title: 'Performance Advisor',
            pathSuffix: 'advisory/performance-advisor',
          },
          {
            title: 'Query Performance',
            pathSuffix: 'advisory/query-performance',
          },
        ],
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: 'ShieldCheck',
    groups: [
      {
        title: 'Continuous Compliance',
        items: [
          { title: 'Masking Rules', pathSuffix: 'compliance/masking-rules' },
          { title: 'PII Detector', pathSuffix: 'compliance/pii-detector' },
        ],
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    icon: 'TableProperties',
    groups: [
      {
        title: 'Data',
        items: [
          { title: 'Datasources', pathSuffix: 'datasources' },
          { title: 'Notebook', pathSuffix: 'notebook' },
          { title: 'SQL Studio', pathSuffix: 'data/sql-studio' },
          { title: 'Dashboard', pathSuffix: 'data/dashboard' },
        ],
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'Sparkles',
    groups: [
      {
        title: 'AI',
        items: [
          { title: 'Chats', pathSuffix: 'chats' },
          { title: 'Models', pathSuffix: 'models' },
          { title: 'Agents', pathSuffix: 'agents' },
          { title: 'Skills', pathSuffix: 'skills' },
          { title: 'Commands', pathSuffix: 'commands' },
          { title: 'Knowledge', pathSuffix: 'knowledge' },
          { title: 'Ontology', pathSuffix: 'ontology' },
          { title: 'Graph', pathSuffix: 'graph' },
        ],
      },
    ],
  },
  {
    id: 'artefacts',
    label: 'Artefacts',
    icon: 'Package',
    groups: [
      {
        title: 'Artefacts',
        items: [
          { title: 'Reports', pathSuffix: 'reports' },
          { title: 'Data Apps', pathSuffix: 'data-apps' },
          { title: 'API', pathSuffix: 'api' },
        ],
      },
    ],
  },
  {
    id: 'project-settings',
    label: 'Settings',
    icon: 'Settings',
    groups: [
      {
        title: 'Project',
        items: [
          { title: 'Project Settings', pathSuffix: 'project-settings' },
        ],
      },
    ],
  },
];

export function makeProjectNavAppId(
  bucketId: string,
  pathSuffix: string,
): string {
  const clean = pathSuffix.replace(/^\//, '');
  return `${bucketId}:${clean}`;
}

/** Flattened nav app entry with bucket context. */
export interface ProjectNavApp {
  id: string;
  topLevelBucketId: ProjectShellBucketId;
  topLevelLabel: string;
  groupTitle: string;
  title: string;
  pathSuffix: string;
}

export function flattenProjectNavApps(): ProjectNavApp[] {
  const out: ProjectNavApp[] = [];
  for (const bucket of PROJECT_SHELL_BUCKETS) {
    for (const group of bucket.groups) {
      for (const item of group.items) {
        out.push({
          id: makeProjectNavAppId(bucket.id, item.pathSuffix),
          topLevelBucketId: bucket.id,
          topLevelLabel: bucket.label,
          groupTitle: group.title,
          title: item.title,
          pathSuffix: item.pathSuffix.replace(/^\//, ''),
        });
      }
    }
  }
  return out;
}
