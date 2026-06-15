import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { z } from 'zod';

import { Entity } from '../common/entity';
import { generateIdentity } from '../utils/identity.generator';

/**
 * Integrations — phase 1 (see docs/rfcs/0001-integrations.md, docs/specs/integrations.md).
 */

export const IntegrationProviderSchema = z
  .enum(['aws', 'gcp'])
  .describe('The cloud provider the integration connects to');

export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationTestStatusSchema = z
  .enum(['untested', 'success', 'failed'])
  .describe('Outcome of the last connection test against the provider');

export type IntegrationTestStatus = z.infer<typeof IntegrationTestStatusSchema>;

/**
 * Non-secret fields persisted on the row. Secrets never live here — they go
 * through ISecretVault.protect() and the returned handle is stored in
 * `secretRef` on the row, not inside `config`.
 */
export const IntegrationConnectionConfigSchema = z
  .object({
    defaultRegion: z
      .string()
      .min(1)
      .describe('Default region used for provider API calls'),
    accountHint: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Human-friendly identifier surfaced in the UI — AWS account id (12 digits) or GCP project id',
      ),
  })
  .describe('Non-secret configuration stored on the integration row');

export type IntegrationConnectionConfig = z.infer<
  typeof IntegrationConnectionConfigSchema
>;

/**
 * Persistence schema for the integration_connections table. See spec §6.1 for
 * the matching SQL definition.
 */
export const IntegrationConnectionSchema = z.object({
  id: z.uuid().describe('The unique identifier for the integration connection'),
  projectId: z.uuid().describe('The project this integration is scoped to'),
  provider: IntegrationProviderSchema,
  name: z
    .string()
    .min(1)
    .max(60)
    .describe('Human-friendly name for the integration'),
  slug: z
    .string()
    .min(1)
    .max(80)
    .describe('URL-safe slug, unique within the project'),
  config: IntegrationConnectionConfigSchema,
  /**
   * Opaque handle returned by ISecretVault.protect(). Phase 1 always populates
   * it on creation; nullable leaves room for a future "draft" flow without a
   * schema migration.
   */
  secretRef: z
    .string()
    .min(1)
    .nullable()
    .describe('Opaque vault handle; raw secrets never touch this schema'),
  testStatus: IntegrationTestStatusSchema.default('untested'),
  testIdentity: z
    .string()
    .nullable()
    .describe(
      'Caller identity reported by the provider on a successful test (AWS ARN or GCP service-account email)',
    ),
  testError: z
    .string()
    .nullable()
    .describe('Provider-supplied error detail from the last failed test'),
  testedAt: z.date().nullable().describe('When the last connection test ran'),
  createdAt: z.date().describe('When the integration was created'),
  updatedAt: z.date().describe('When the integration was last updated'),
  createdBy: z
    .uuid()
    .nullable()
    .describe(
      'User who created the integration (null if the user was deleted)',
    ),
  updatedBy: z
    .uuid()
    .nullable()
    .describe(
      'User who last updated the integration (null if the user was deleted)',
    ),
});

export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>;

/**
 * Input for IntegrationConnectionEntity.create(). Deliberately does NOT
 * include the raw credentials — those are handled by the calling service,
 * protected via ISecretVault, and only the returned opaque handle
 * (`secretRef`) is passed in here.
 */
export type CreateIntegrationConnectionEntityInput = {
  projectId: string;
  provider: IntegrationProvider;
  name: string;
  config: IntegrationConnectionConfig;
  secretRef: string;
  createdBy: string;
};

/**
 * Input for IntegrationConnectionEntity.update(). Phase 1 only allows
 * renaming; credential rotation and test-result persistence go through
 * dedicated repository methods so the entity stays a frozen snapshot in
 * between.
 */
export type UpdateIntegrationConnectionEntityInput = {
  name?: string;
  updatedBy: string;
};

@Exclude()
export class IntegrationConnectionEntity extends Entity<
  string,
  typeof IntegrationConnectionSchema
> {
  @Expose()
  declare public id: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public provider!: IntegrationProvider;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public config!: IntegrationConnectionConfig;
  @Expose()
  public secretRef!: string | null;
  @Expose()
  public testStatus!: IntegrationTestStatus;
  @Expose()
  public testIdentity!: string | null;
  @Expose()
  public testError!: string | null;
  @Expose()
  @Type(() => Date)
  public testedAt!: Date | null;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string | null;
  @Expose()
  public updatedBy!: string | null;

  public static create(
    input: CreateIntegrationConnectionEntityInput,
  ): IntegrationConnectionEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const integration: IntegrationConnection = {
      id,
      projectId: input.projectId,
      provider: input.provider,
      name: input.name,
      slug,
      config: input.config,
      secretRef: input.secretRef,
      testStatus: 'untested',
      testIdentity: null,
      testError: null,
      testedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    };

    return plainToClass(
      IntegrationConnectionEntity,
      IntegrationConnectionSchema.parse(integration),
    );
  }

  public static update(
    existing: IntegrationConnection,
    patch: UpdateIntegrationConnectionEntityInput,
  ): IntegrationConnectionEntity {
    const updated: IntegrationConnection = {
      ...existing,
      ...(patch.name !== undefined && { name: patch.name }),
      updatedAt: new Date(),
      updatedBy: patch.updatedBy,
    };

    return plainToClass(
      IntegrationConnectionEntity,
      IntegrationConnectionSchema.parse(updated),
    );
  }
}
