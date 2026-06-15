/**
 * Presentation-only types carved from the dying `@guepard/infrastructure`
 * pkg as part of RFC 0025 phase 1, story 005. Cluster/provider/region
 * view-models were deleted (Topology + Pool entity cover that surface
 * now); only the replica/settings/activity types travel forward.
 *
 * Subpath export: `@guepard/infrastructure/types` (preserved by the
 * package.json `exports` field). MSW handlers (`apps/web/src/lib/msw/
 * handlers/replicas.ts`, `…/fixtures/infrastructure.ts`) consume from
 * here.
 */

export type ReplicaStatus = 'provisioning' | 'available' | 'degraded' | 'error';

export type Replica = {
  id: string;
  projectId: string;
  region: string;
  provider: string;
  computeTier: string;
  status: ReplicaStatus;
  createdAt: string;
};

export type InfrastructureSettings = {
  computeTier: string;
  diskGb: number;
  usedDb: number;
  usedWal: number;
  usedSys: number;
  diskType: 'gp3' | 'io2';
  iops: number;
  throughput: number;
};

export type ActivityDataPoint = { date: string; value: number };

export type InfrastructureActivity = {
  cpu: ActivityDataPoint[];
  memory: ActivityDataPoint[];
  diskIo: ActivityDataPoint[];
};
