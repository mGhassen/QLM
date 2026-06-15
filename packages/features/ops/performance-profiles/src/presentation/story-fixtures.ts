import type { PerformanceProfile } from '@qlm/domain/entities';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function storyProfile(overrides: Partial<PerformanceProfile> = {}): PerformanceProfile {
  return {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    labelName: 'standard',
    databaseProvider: 'postgres',
    databaseVersion: '15',
    minCpu: 1000,
    minMemory: 1024,
    configFlags: { max_connections: 100, shared_buffers: '256MB', work_mem: '4MB' },
    isDefault: true,
    isActive: true,
    isSeed: true,
    accountId: null,
    createdAt: isoDaysAgo(90),
    updatedAt: isoDaysAgo(30),
    ...overrides,
  };
}

export const STORY_PROFILES: PerformanceProfile[] = [
  storyProfile({ id: '11111111-1111-4111-8111-111111111111', labelName: 'micro',      databaseProvider: 'postgres', databaseVersion: '15',  minCpu: 250,   minMemory: 256,  isDefault: false, configFlags: {} }),
  storyProfile({ id: '22222222-2222-4222-8222-222222222222', labelName: 'standard',   databaseProvider: 'postgres', databaseVersion: '15',  minCpu: 1000,  minMemory: 1024, isDefault: true }),
  storyProfile({ id: '33333333-3333-4333-8333-333333333333', labelName: 'performance',databaseProvider: 'postgres', databaseVersion: '15',  minCpu: 2000,  minMemory: 4096, isDefault: false, configFlags: { max_connections: 500, huge_pages: 'on' } }),
  storyProfile({ id: '44444444-4444-4444-8444-444444444444', labelName: 'standard',   databaseProvider: 'mysql',    databaseVersion: '8.0', minCpu: 1000,  minMemory: 1024, isDefault: true,  configFlags: { innodb_buffer_pool_size: '512M' } }),
  storyProfile({ id: '55555555-5555-4555-8555-555555555555', labelName: 'standard',   databaseProvider: 'redis',    databaseVersion: '7',   minCpu: 500,   minMemory: 512,  isDefault: true,  configFlags: { maxmemory: '256mb', maxmemory_policy: 'allkeys-lru' } }),
  storyProfile({ id: '66666666-6666-4666-8666-666666666666', labelName: 'standard',   databaseProvider: 'mongodb',  databaseVersion: '7.0', minCpu: 1000,  minMemory: 2048, isDefault: true,  configFlags: {} }),
  storyProfile({ id: '77777777-7777-4777-8777-777777777777', labelName: 'legacy-v14', databaseProvider: 'postgres', databaseVersion: '14',  minCpu: 1000,  minMemory: 1024, isDefault: false, isActive: false, configFlags: {} }),
];
