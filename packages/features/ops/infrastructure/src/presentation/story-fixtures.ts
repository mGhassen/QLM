import type { Node, NodeHealth, NodeLifecycleState } from '@guepard/domain/entities';

const BASE_CREATED = '2025-01-01T00:00:00.000Z';
const BASE_UPDATED = '2026-01-01T00:00:00.000Z';

const now = Date.now();
export const LAST_SEEN = {
  fresh: new Date(now - 20_000).toISOString(),
  recent: new Date(now - 3 * 60_000).toISOString(),
  stale: new Date(now - 30 * 60_000).toISOString(),
  cold: new Date(now - 3 * 3_600_000).toISOString(),
  never: undefined,
} as const;

/**
 * Internal seed kind — drives all five axes for storybook fixtures.
 * RFC 0026 §5; mirrors the MSW seed pattern in
 * `apps/web/src/lib/msw/fixtures/nodes.ts`.
 */
type SeedKind = 'running' | 'draining' | 'stopped' | 'error';

function lifecycleFor(seed: SeedKind): NodeLifecycleState {
  if (seed === 'stopped' || seed === 'error') return 'stopped';
  return 'active';
}

function healthFor(seed: SeedKind): NodeHealth {
  if (seed === 'error') return 'critical';
  if (seed === 'draining') return 'unknown';
  if (seed === 'stopped') return 'unknown';
  return 'healthy';
}

export function storyNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node_story_001',
    projectId: 'prj_storybook',
    name: 'worker-001',
    kind: 'standard-4',
    region: 'us-east-1',
    cpuCores: 4,
    memoryGb: 16,
    tags: ['production'],
    version: 1,
    cpuUtilPct: 38,
    memUtilPct: 55,
    provider: 'aws',
    cluster: 'cluster-prod-a',
    ip: '10.0.1.42',
    owner: 'platform-team',
    lastSeenAt: LAST_SEEN.fresh,
    lifecycle: 'active',
    orchestration: 'ready',
    eligibility: 'eligible',
    health: 'healthy',
    lastHeartbeatAt: LAST_SEEN.fresh,
    createdAt: BASE_CREATED,
    updatedAt: BASE_UPDATED,
    ...overrides,
  };
}

const SEED_KINDS: SeedKind[] = ['running', 'draining', 'stopped', 'error'];
const PROVIDERS: Node['provider'][] = ['aws', 'gcp', 'azure', 'on-premise', undefined];
const REGIONS: Node['region'][] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
];
const CPU_CORES = [2, 4, 8, 4, 8] as const;
const MEMORY_GB = [8, 16, 32, 32, 16] as const;
const LAST_SEEN_CYCLE = [
  LAST_SEEN.fresh,
  LAST_SEEN.recent,
  LAST_SEEN.stale,
  LAST_SEEN.cold,
  LAST_SEEN.never,
] as const;

export const STORY_NODES: Node[] = Array.from({ length: 20 }, (_, i) => {
  const seed = SEED_KINDS[i % 4]!;
  const lifecycle = lifecycleFor(seed);
  const eligibility = seed === 'draining' ? 'ineligible' : 'eligible';
  const drain =
    seed === 'draining'
      ? {
          active: true,
          ignoreSystemJobs: false,
          force: false,
          startedAt: LAST_SEEN.fresh,
        }
      : undefined;
  const orchestration =
    seed === 'stopped' || seed === 'error' ? 'down' : 'ready';
  return storyNode({
    id: `node_story_${String(i + 1).padStart(3, '0')}`,
    name: `worker-${String(i + 1).padStart(3, '0')}`,
    lifecycle,
    orchestration,
    eligibility,
    drain,
    health: healthFor(seed),
    provider: PROVIDERS[i % 5],
    region: REGIONS[i % 5]!,
    cpuCores: CPU_CORES[i % 5]!,
    memoryGb: MEMORY_GB[i % 5]!,
    lastSeenAt: LAST_SEEN_CYCLE[i % 5],
  });
});
