import type { MetricsPoint, Node, NodeHealth } from '@guepard/domain/entities';

const NAMES = [
  'api-gateway',
  'worker-primary',
  'worker-replica',
  'analytics-etl',
  'ingest-ws',
  'scheduler',
  'postgres-writer',
  'postgres-reader',
  'search-index',
  'cache-warm',
  'batch-jobs',
  'feature-store',
];

const TAGS = [
  'prod',
  'staging',
  'critical',
  'gpu',
  'batch',
  'edge',
  'hot',
  'cold',
];
const CLUSTERS = [
  'prod-us-east',
  'prod-eu-west',
  'staging-us',
  'dev-local',
  'edge-apac',
];
const OWNERS = [
  'alice@rasm.ai',
  'bob@rasm.ai',
  'carol@rasm.ai',
  'ops-team@rasm.ai',
  'platform@rasm.ai',
];
const PROVIDERS = ['aws', 'gcp', 'azure', 'on-premise'] as const;

/** Internal seed kind — drives all five axes. RFC 0026 §5. */
type SeedKind = 'running' | 'draining' | 'stopped' | 'error';

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

function isoMinutesAgo(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * `lastSeenAt` jittered across bucket ranges so the age-coloured dot on
 * the list/card surface exercises each threshold (<1m, <5m, <1h, >1h,
 * null). Buckets: 0, 2m, 20m, 3h, null (for stopped/error).
 */
function lastSeenFor(seed: SeedKind, i: number): string | undefined {
  if (seed === 'stopped' || seed === 'error') return undefined;
  const bucket = i % 4;
  if (bucket === 0) return isoMinutesAgo(0);
  if (bucket === 1) return isoMinutesAgo(2);
  if (bucket === 2) return isoMinutesAgo(20);
  return isoMinutesAgo(180);
}

function utilFor(seed: SeedKind, i: number): { cpu: number; mem: number } {
  if (seed === 'stopped') return { cpu: 0, mem: 0 };
  if (seed === 'error') return { cpu: 5, mem: 10 };
  const cpu = 10 + ((i * 17) % 85);
  const mem = 15 + ((i * 23) % 75);
  return { cpu, mem };
}

function healthFor(
  seed: SeedKind,
  util: { cpu: number; mem: number },
): NodeHealth {
  if (seed === 'error') return 'critical';
  if (seed === 'draining') return 'unknown';
  if (seed === 'stopped') return 'unknown';
  if (util.cpu >= 90 || util.mem >= 90) return 'critical';
  if (util.cpu >= 70 || util.mem >= 70) return 'degraded';
  return 'healthy';
}

export function generateSeedNodes(projectId: string, count = 200): Node[] {
  const kinds = [
    'standard-2',
    'standard-4',
    'standard-8',
    'highmem-4',
    'highmem-8',
    'highcpu-8',
  ] as const;
  const regions = [
    'us-east-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-southeast-1',
  ] as const;
  const seedKinds: SeedKind[] = [
    'running',
    'running',
    'running',
    'running',
    'running',
    'draining',
    'stopped',
    'error',
  ];

  return Array.from({ length: count }).map((_, i): Node => {
    const name = `${pick(NAMES, i)}-${String(i + 1).padStart(3, '0')}`;
    const kind = pick(kinds, i);
    const tagCount = (i % 3) + 1;
    const tags = Array.from({ length: tagCount }, (_, k) => pick(TAGS, i + k));
    const cpuCores = Number(kind.split('-')[1]) || 2;
    const memoryGb = kind.startsWith('highmem-')
      ? cpuCores * 8
      : kind.startsWith('highcpu-')
        ? cpuCores * 2
        : cpuCores * 4;
    const seed = pick(seedKinds, i);
    const subnet = ((i * 7 + 11) % 254) + 1;
    const host = ((i * 13 + 5) % 254) + 1;
    const util = utilFor(seed, i);
    const lifecycle =
      seed === 'stopped' || seed === 'error' ? 'stopped' : 'active';
    const orchestration =
      seed === 'stopped' || seed === 'error' ? 'down' : 'ready';
    const eligibility = seed === 'draining' ? 'ineligible' : 'eligible';
    const drain =
      seed === 'draining'
        ? {
            active: true,
            ignoreSystemJobs: false,
            force: false,
            startedAt: isoDaysAgo(0),
          }
        : undefined;
    const health = healthFor(seed, util);

    return {
      id: `node_${projectId.slice(0, 6)}_${String(i).padStart(3, '0')}`,
      projectId,
      name,
      kind,
      region: pick(regions, i),
      cpuCores,
      memoryGb,
      tags,
      version: 1,
      cpuUtilPct: util.cpu,
      memUtilPct: util.mem,
      provider: pick(PROVIDERS, i),
      cluster: pick(CLUSTERS, i),
      ip: `10.${i % 4}.${subnet}.${host}`,
      owner: pick(OWNERS, i),
      lastSeenAt: lastSeenFor(seed, i),
      lifecycle,
      orchestration,
      eligibility,
      drain,
      health,
      lastHeartbeatAt: lastSeenFor(seed, i),
      createdAt: isoDaysAgo(30 + (i % 60)),
      updatedAt: isoDaysAgo(i % 14),
    };
  });
}

/** Legacy seed name kept for callers that imported it directly. */
export const seedNodes = generateSeedNodes;

/**
 * Deterministic 24h metric series (60 points, 24-min buckets) — CPU and
 * memory wander around the node's baseline utilisation. Used by the detail
 * sheet sparkline.
 */
export function generateMetrics24h(node: Node): MetricsPoint[] {
  const points = 60;
  const baselineCpu = node.cpuUtilPct ?? 40;
  const baselineMem = node.memUtilPct ?? 50;
  const now = Date.now();
  const stepMs = (24 * 60 * 60 * 1000) / points;
  return Array.from({ length: points }).map((_, i) => {
    const t = new Date(now - (points - i - 1) * stepMs).toISOString();
    const wave = Math.sin((i + hash(node.id)) / 6) * 12;
    const noise = ((hash(node.id + String(i)) % 100) - 50) / 10;
    const cpu = clamp(baselineCpu + wave + noise, 0, 100);
    const mem = clamp(baselineMem + wave * 0.6 + noise * 0.8, 0, 100);
    return { t, cpu: Number(cpu.toFixed(1)), mem: Number(mem.toFixed(1)) };
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
