import { z } from 'zod';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Entity } from '../common/entity';
import { generateIdentity } from '../utils/identity.generator';
import { PerformanceProfileSchema } from './performance-profile.type';
import type { CreateDatabaseInput, UpdateDatabaseInput } from '../usecases/dto';

export const DATABASE_STATUSES = [
  'init',
  'pending',
  'in_progress',
  'created',
  'error',
  'deleted',
] as const;
export type DatabaseStatus = (typeof DATABASE_STATUSES)[number];

export const DATABASE_PROVIDERS = [
  'postgres',
  'mysql',
  'redis',
  'mongodb',
] as const;
export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number];

export const DEPLOYMENT_TYPES = ['repository', 'shadow', 'f2'] as const;
export type DeploymentType = (typeof DEPLOYMENT_TYPES)[number];

export const DB_ROLE_STATUSES = [
  'init',
  'created',
  'active',
  'revoked',
  'deleted',
  'error',
] as const;
export type DbRoleStatus = (typeof DB_ROLE_STATUSES)[number];

/** Embedded sub-type: `public.db_role` joined to a database. Password is never included. */
export const DbRoleSchema = z.object({
  id: z.string(),
  username: z.string(),
  superuser: z.boolean(),
  privileges: z.array(z.unknown()),
  status: z.enum(DB_ROLE_STATUSES),
});
export type DbRole = z.infer<typeof DbRoleSchema>;

/** Embedded sub-type: `public.compute` joined to a database. */
export const DatabaseComputeSchema = z.object({
  id: z.string(),
  labelName: z.string(),
  jobStatus: z.string(),
  computeStatus: z.string().optional(),
  performanceProfile: PerformanceProfileSchema.optional(),
});
export type DatabaseCompute = z.infer<typeof DatabaseComputeSchema>;

export const DatabaseSchema = z.object({
  id: z.string(),
  /** `deployment_request.name` — globally unique deployment label. */
  name: z.string(),
  accountId: z.string(),
  provider: z.string(),
  version: z.string(),
  status: z.enum(DATABASE_STATUSES),
  deploymentType: z.enum(DEPLOYMENT_TYPES),
  fqdn: z.string(),
  port: z.number().int().optional(),
  nodeId: z.string().optional().nullable(),
  dbUserId: z.string().optional().nullable(),
  /** Eagerly-joined compute instance (may be absent before deployment completes). */
  compute: DatabaseComputeSchema.optional(),
  /** Eagerly-joined db_role (may be absent before DB user is provisioned). */
  dbRole: DbRoleSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Database = z.infer<typeof DatabaseSchema>;

@Exclude()
export class DatabaseEntity extends Entity<string, typeof DatabaseSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public accountId!: string;
  @Expose()
  public provider!: string;
  @Expose()
  public version!: string;
  @Expose()
  public status!: DatabaseStatus;
  @Expose()
  public deploymentType!: DeploymentType;
  @Expose()
  public fqdn!: string;
  @Expose()
  public port?: number;
  @Expose()
  public nodeId?: string | null;
  @Expose()
  public dbUserId?: string | null;
  @Expose()
  public compute?: DatabaseCompute;
  @Expose()
  public dbRole?: DbRole;
  @Expose()
  public createdAt!: string;
  @Expose()
  public updatedAt!: string;

  public static create(input: CreateDatabaseInput): DatabaseEntity {
    const { id } = generateIdentity();
    const now = new Date().toISOString();
    const db: Database = {
      id,
      name: input.name,
      accountId: input.accountId,
      provider: input.provider,
      version: input.version,
      status: 'init',
      deploymentType: input.deploymentType ?? 'repository',
      fqdn: input.fqdn,
      port: input.port,
      nodeId: input.nodeId,
      dbUserId: input.dbUserId,
      createdAt: now,
      updatedAt: now,
    };
    return plainToClass(DatabaseEntity, DatabaseSchema.parse(db));
  }

  public static update(
    database: Database,
    input: UpdateDatabaseInput,
  ): DatabaseEntity {
    const updated: Database = {
      ...database,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.nodeId !== undefined ? { nodeId: input.nodeId } : {}),
      ...(input.port !== undefined ? { port: input.port } : {}),
      updatedAt: new Date().toISOString(),
    };
    return plainToClass(DatabaseEntity, DatabaseSchema.parse(updated));
  }
}
