import type { DatabaseOutput } from '@qlm/domain/usecases';
import type { PerformanceProfile } from '@qlm/domain/entities';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const STORY_PERF_PROFILE: PerformanceProfile = {
  id: '3f6c8a2e-1b4d-4e7f-9c0a-5d8e2f1a3b6c',
  labelName: 'standard',
  databaseProvider: 'postgres',
  databaseVersion: '15',
  minCpu: 1000,
  minMemory: 1024,
  configFlags: { max_connections: 100, shared_buffers: '256MB' },
  isDefault: true,
  isActive: true,
  isSeed: true,
  accountId: null,
  createdAt: isoDaysAgo(90),
  updatedAt: isoDaysAgo(30),
};

export function storyDatabase(overrides: Partial<DatabaseOutput> = {}): DatabaseOutput {
  return {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'app-primary',
    accountId: 'f0e1d2c3-b4a5-4967-8e9f-0a1b2c3d4e5f',
    provider: 'postgres',
    version: '15',
    status: 'created',
    deploymentType: 'repository',
    fqdn: 'app-primary.db.qlm.internal',
    port: 5432,
    nodeId: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    dbUserId: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    compute: {
      id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
      labelName: 'compute-app-primary',
      jobStatus: 'CREATED',
      computeStatus: 'RUNNING',
      performanceProfile: STORY_PERF_PROFILE,
    },
    dbRole: {
      id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
      username: 'app_primary_user',
      superuser: false,
      privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      status: 'active',
    },
    createdAt: isoDaysAgo(30),
    updatedAt: isoDaysAgo(1),
    ...overrides,
  };
}

export const STORY_DATABASES: DatabaseOutput[] = [
  storyDatabase({ id: '11111111-1111-4111-8111-111111111111', name: 'analytics-pg',  provider: 'postgres', status: 'created',     fqdn: 'analytics-pg.db.qlm.internal',  port: 5432 }),
  storyDatabase({ id: '22222222-2222-4222-8222-222222222222', name: 'app-primary',   provider: 'postgres', status: 'created',     fqdn: 'app-primary.db.qlm.internal',   port: 5433 }),
  storyDatabase({ id: '33333333-3333-4333-8333-333333333333', name: 'app-staging',   provider: 'mysql',    status: 'pending',     fqdn: 'app-staging.db.qlm.internal',   port: 3306, compute: undefined, dbRole: undefined }),
  storyDatabase({ id: '44444444-4444-4444-8444-444444444444', name: 'cache-redis',   provider: 'redis',    status: 'in_progress', fqdn: 'cache-redis.db.qlm.internal',   port: 6379, compute: undefined, dbRole: undefined }),
  storyDatabase({ id: '55555555-5555-4555-8555-555555555555', name: 'reporting-db',  provider: 'postgres', status: 'created',     fqdn: 'reporting-db.db.qlm.internal',  port: 5434 }),
  storyDatabase({ id: '66666666-6666-4666-8666-666666666666', name: 'backup-pg',     provider: 'postgres', status: 'error',       fqdn: 'backup-pg.db.qlm.internal',     port: 5435, compute: undefined, dbRole: undefined }),
  storyDatabase({ id: '77777777-7777-4777-8777-777777777777', name: 'shadow-clone',  provider: 'postgres', status: 'init',        fqdn: 'shadow-clone.db.qlm.internal',  port: 5436, compute: undefined, dbRole: undefined }),
  storyDatabase({ id: '88888888-8888-4888-8888-888888888888', name: 'legacy-mysql',  provider: 'mysql',    status: 'deleted',     fqdn: 'legacy-mysql.db.qlm.internal',  port: 3307, compute: undefined, dbRole: undefined }),
];
