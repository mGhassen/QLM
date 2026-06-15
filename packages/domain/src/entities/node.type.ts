import { z } from 'zod';
import {
  Exclude,
  Expose,
  instanceToPlain,
  plainToClass,
} from 'class-transformer';

import { Entity } from '../common/entity';
import { generateIdentity } from '../utils/identity.generator';
import type { CreateNodeInput, UpdateNodeInput } from '../usecases/dto';

export const NODE_KINDS = [
  'standard-2',
  'standard-4',
  'standard-8',
  'highmem-4',
  'highmem-8',
  'highcpu-8',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
] as const;
export type NodeRegion = (typeof NODE_REGIONS)[number];

export const NODE_PROVIDERS = ['aws', 'gcp', 'azure', 'on-premise'] as const;
export type NodeProvider = (typeof NODE_PROVIDERS)[number];

// ---------------------------------------------------------------------
// Node state decomposition (RFC 0026)
// ---------------------------------------------------------------------
// Five orthogonal axes describe a Node's state.

/** Operator-driven control-plane truth. RFC 0026 §5.2. */
export const NODE_LIFECYCLE_STATES = [
  'provisioning',
  'active',
  'stopping',
  'stopped',
  'terminating',
  'terminated',
] as const;
export type NodeLifecycleState = (typeof NODE_LIFECYCLE_STATES)[number];

/** Observed by the orchestrator. UI never writes this. RFC 0026 §5.3. */
export const NODE_ORCHESTRATION_STATES = [
  'unknown',
  'initializing',
  'ready',
  'down',
  'disconnected',
] as const;
export type NodeOrchestrationState = (typeof NODE_ORCHESTRATION_STATES)[number];

/** Operator intent — orthogonal to lifecycle and orchestration. */
export const NODE_ELIGIBILITY_STATES = ['eligible', 'ineligible'] as const;
export type NodeEligibility = (typeof NODE_ELIGIBILITY_STATES)[number];

/**
 * Computed health — pure telemetry, never persisted. Adapter applies
 * `deriveNodeHealth(...)` on read. RFC 0026 §5.4a.
 */
export const NODE_HEALTH = [
  'healthy',
  'degraded',
  'critical',
  'unknown',
] as const;
export type NodeHealth = (typeof NODE_HEALTH)[number];

/**
 * Structured drain state matching Nomad's DrainStrategy. 1:1 sub-row of
 * `public.node_drain` materialized onto `Node.drain`.
 */
export const NodeDrainSchema = z.object({
  active: z.boolean(),
  deadline: z.string().optional(),
  ignoreSystemJobs: z.boolean().default(false),
  force: z.boolean().default(false),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type NodeDrain = z.infer<typeof NodeDrainSchema>;

export const NodeSchema = z.object({
  id: z.string().describe('The unique identifier for the node'),
  projectId: z.string().describe('The project the node belongs to'),
  name: z.string().min(1).max(255).describe('Human-readable node name'),
  kind: z.enum(NODE_KINDS).describe('Machine kind / instance class'),
  region: z.enum(NODE_REGIONS).describe('Region where node is provisioned'),
  cpuCores: z.number().int().positive().describe('Allocated vCPU count'),
  memoryGb: z.number().positive().describe('Allocated memory in GB'),
  tags: z.array(z.string()).default([]),
  version: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Optimistic-concurrency version; incremented on update'),
  cpuUtilPct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Observed CPU utilization percentage'),
  memUtilPct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Observed memory utilization percentage'),
  diskGb: z
    .number()
    .nonnegative()
    .optional()
    .describe('Allocated disk capacity in GB'),
  diskUtilPct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Observed disk utilization percentage'),
  provider: z.enum(NODE_PROVIDERS).optional(),
  cluster: z.string().optional(),
  ip: z.string().optional(),
  owner: z.string().optional(),
  lastSeenAt: z.string().optional(),
  // RFC 0026 — 5-axis state. `lifecycle`, `orchestration`, `eligibility`
  // are NOT NULL on the DB side (defaults: provisioning / unknown /
  // eligible) but stay optional here because in-memory fixtures
  // sometimes construct a Node from a partial. Adapters always populate.
  lifecycle: z.enum(NODE_LIFECYCLE_STATES).optional(),
  orchestration: z.enum(NODE_ORCHESTRATION_STATES).optional(),
  eligibility: z.enum(NODE_ELIGIBILITY_STATES).optional(),
  drain: NodeDrainSchema.optional(),
  health: z.enum(NODE_HEALTH).optional(),
  lastHeartbeatAt: z.string().optional(),
  heartbeatTtlSeconds: z.number().int().positive().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Node = z.infer<typeof NodeSchema>;

export type MetricsRange = '24h' | '7d';

export const MetricsPointSchema = z.object({
  t: z.string(),
  cpu: z.number(),
  mem: z.number(),
});

export type MetricsPoint = z.infer<typeof MetricsPointSchema>;

@Exclude()
export class NodeEntity extends Entity<string, typeof NodeSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public name!: string;
  @Expose()
  public kind!: NodeKind;
  @Expose()
  public region!: NodeRegion;
  @Expose()
  public cpuCores!: number;
  @Expose()
  public memoryGb!: number;
  @Expose()
  public tags!: string[];
  @Expose()
  public version!: number;
  @Expose()
  public cpuUtilPct?: number;
  @Expose()
  public memUtilPct?: number;
  @Expose()
  public diskGb?: number;
  @Expose()
  public diskUtilPct?: number;
  @Expose()
  public provider?: NodeProvider;
  @Expose()
  public cluster?: string;
  @Expose()
  public ip?: string;
  @Expose()
  public owner?: string;
  @Expose()
  public lastSeenAt?: string;
  @Expose()
  public lifecycle?: NodeLifecycleState;
  @Expose()
  public orchestration?: NodeOrchestrationState;
  @Expose()
  public eligibility?: NodeEligibility;
  @Expose()
  public drain?: NodeDrain;
  @Expose()
  public health?: NodeHealth;
  @Expose()
  public lastHeartbeatAt?: string;
  @Expose()
  public heartbeatTtlSeconds?: number;
  @Expose()
  public createdAt!: string;
  @Expose()
  public updatedAt!: string;

  public static create(input: CreateNodeInput): NodeEntity {
    const { id } = generateIdentity();
    const now = new Date().toISOString();
    const node: Node = {
      id,
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      region: input.region,
      cpuCores: input.cpuCores,
      memoryGb: input.memoryGb,
      tags: input.tags ?? [],
      version: 1,
      provider: input.provider,
      cluster: input.cluster,
      ip: input.ip,
      owner: input.owner,
      lifecycle: 'provisioning',
      orchestration: 'unknown',
      eligibility: 'eligible',
      createdAt: now,
      updatedAt: now,
    };

    return plainToClass(NodeEntity, NodeSchema.parse(node));
  }

  public static update(node: Node, input: UpdateNodeInput): NodeEntity {
    const { id: _dropId, ...rest } = input;
    void _dropId;
    const updated: Node = {
      ...node,
      ...rest,
      version: node.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const transformed = plainToClass(NodeEntity, updated);
    const plain = instanceToPlain(transformed) as Node;
    return plainToClass(NodeEntity, NodeSchema.parse(plain));
  }
}
