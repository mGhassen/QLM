import type {
  ActivityDataPoint,
  InfrastructureActivity,
  InfrastructureSettings,
} from '@qlm/infrastructure/types';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const COMPUTE_TIERS = [
  'nano',
  'micro',
  'small',
  'medium',
  'large',
  'xl',
] as const;
const DISK_SIZES = [8, 16, 32, 64] as const;

export function generateInfrastructureSettings(
  projectId: string,
): InfrastructureSettings {
  const h = hash(projectId);
  const tier = COMPUTE_TIERS[h % COMPUTE_TIERS.length]!;
  const diskGb = DISK_SIZES[h % DISK_SIZES.length]!;
  const usedDb = Number((diskGb * 0.011 * (1 + (h % 10) / 10)).toFixed(2));
  const usedWal = Number((diskGb * 0.01).toFixed(2));
  const usedSys = Number((diskGb * 0.016).toFixed(2));
  const diskType = h % 3 === 0 ? 'io2' : 'gp3';
  const iops = 3_000 + (h % 13) * 1_000;
  const throughput = 125 + (h % 8) * 125;
  return {
    computeTier: tier,
    diskGb,
    usedDb,
    usedWal,
    usedSys,
    diskType,
    iops,
    throughput,
  };
}

function generateSeries(
  days: number,
  min: number,
  max: number,
  seed: number,
): ActivityDataPoint[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86_400_000);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const value = Math.round(min + seededRandom(seed + i) * (max - min));
    return { date: label, value };
  });
}

export function generateInfrastructureActivity(
  projectId: string,
  source: 'primary' | 'replica',
  range: '7d' | '14d' | '30d',
): InfrastructureActivity {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  const h = hash(projectId);
  const sourceSeed = source === 'primary' ? h : h + 1000;
  return {
    cpu: generateSeries(days, 2, 28, sourceSeed + 1),
    memory: generateSeries(days, 38, 68, sourceSeed + 2),
    diskIo: generateSeries(days, 0, 22, sourceSeed + 3),
  };
}
