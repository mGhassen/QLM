import type { DatabaseOutput } from '@qlm/domain/usecases';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function uuid(seed: string): string {
  const h = hash(seed).toString(16).padStart(8, '0');
  return `${h}-0000-4000-8000-000000000000`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const PERF_PROFILES = [
  {
    id: uuid('pp-micro'),
    labelName: 'micro',
    databaseProvider: 'postgres',
    databaseVersion: '15',
    minCpu: 100,
    minMemory: 128,
    isDefault: false,
    isActive: true,
    isSeed: true,
    accountId: null,
    configFlags: undefined,
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(30),
  },
  {
    id: uuid('pp-standard'),
    labelName: 'standard',
    databaseProvider: 'postgres',
    databaseVersion: '15',
    minCpu: 1000,
    minMemory: 1024,
    isDefault: true,
    isActive: true,
    isSeed: true,
    accountId: null,
    configFlags: { max_connections: 100, shared_buffers: '256MB' },
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(30),
  },
  {
    id: uuid('pp-large'),
    labelName: 'large',
    databaseProvider: 'postgres',
    databaseVersion: '15',
    minCpu: 4000,
    minMemory: 8192,
    isDefault: false,
    isActive: true,
    isSeed: true,
    accountId: null,
    configFlags: {
      max_connections: 500,
      shared_buffers: '2GB',
      work_mem: '64MB',
    },
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(30),
  },
  {
    id: uuid('pp-mysql-std'),
    labelName: 'mysql-standard',
    databaseProvider: 'mysql',
    databaseVersion: '8.0',
    minCpu: 1000,
    minMemory: 1024,
    isDefault: true,
    isActive: true,
    isSeed: true,
    accountId: null,
    configFlags: undefined,
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(30),
  },
];

type FixtureRow = {
  name: string;
  provider: string;
  version: string;
  status: DatabaseOutput['status'];
  fqdn: string;
  port: number;
  ppIndex: number;
  withCompute: boolean;
  withRole: boolean;
};

const ROWS: FixtureRow[] = [
  {
    name: 'analytics-pg',
    provider: 'postgres',
    version: '15',
    status: 'created',
    fqdn: 'analytics-pg.db.qlm.internal',
    port: 5432,
    ppIndex: 2,
    withCompute: true,
    withRole: true,
  },
  {
    name: 'app-primary',
    provider: 'postgres',
    version: '16',
    status: 'created',
    fqdn: 'app-primary.db.qlm.internal',
    port: 5433,
    ppIndex: 1,
    withCompute: true,
    withRole: true,
  },
  {
    name: 'app-staging',
    provider: 'mysql',
    version: '8.0',
    status: 'pending',
    fqdn: 'app-staging.db.qlm.internal',
    port: 3306,
    ppIndex: 3,
    withCompute: false,
    withRole: false,
  },
  {
    name: 'cache-redis',
    provider: 'redis',
    version: '7',
    status: 'in_progress',
    fqdn: 'cache-redis.db.qlm.internal',
    port: 6379,
    ppIndex: 0,
    withCompute: false,
    withRole: false,
  },
  {
    name: 'reporting-db',
    provider: 'postgres',
    version: '15',
    status: 'created',
    fqdn: 'reporting-db.db.qlm.internal',
    port: 5434,
    ppIndex: 1,
    withCompute: true,
    withRole: true,
  },
  {
    name: 'backup-pg',
    provider: 'postgres',
    version: '14',
    status: 'error',
    fqdn: 'backup-pg.db.qlm.internal',
    port: 5435,
    ppIndex: 0,
    withCompute: false,
    withRole: false,
  },
  {
    name: 'shadow-clone',
    provider: 'postgres',
    version: '15',
    status: 'init',
    fqdn: 'shadow-clone.db.qlm.internal',
    port: 5436,
    ppIndex: 0,
    withCompute: false,
    withRole: false,
  },
  {
    name: 'legacy-mysql',
    provider: 'mysql',
    version: '5.7',
    status: 'deleted',
    fqdn: 'legacy-mysql.db.qlm.internal',
    port: 3307,
    ppIndex: 3,
    withCompute: false,
    withRole: false,
  },
];

export function seedDatabases(projectId: string): DatabaseOutput[] {
  const h = hash(projectId);
  return ROWS.map((row, i): DatabaseOutput => {
    const id = uuid(`db-${projectId}-${i}`);
    const pp = PERF_PROFILES[row.ppIndex]!;
    return {
      id,
      name: row.name,
      accountId: projectId,
      provider: row.provider,
      version: row.version,
      status: row.status,
      deploymentType: i % 3 === 2 ? 'shadow' : 'repository',
      fqdn: row.fqdn,
      port: row.port,
      nodeId: row.withCompute ? uuid(`node-${h}-${i}`) : undefined,
      dbUserId: row.withRole ? uuid(`role-${h}-${i}`) : undefined,
      compute: row.withCompute
        ? {
            id: uuid(`compute-${h}-${i}`),
            labelName: `compute-${row.name}`,
            jobStatus: 'CREATED',
            computeStatus: 'RUNNING',
            performanceProfile: pp,
          }
        : undefined,
      dbRole: row.withRole
        ? {
            id: uuid(`role-${h}-${i}`),
            username: `${row.name.replace(/-/g, '_')}_user`,
            superuser: false,
            privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
            status: 'active',
          }
        : undefined,
      createdAt: isoDaysAgo(30 - i * 3),
      updatedAt: isoDaysAgo(i),
    };
  });
}
