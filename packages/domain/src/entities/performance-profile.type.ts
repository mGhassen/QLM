import { z } from 'zod';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Entity } from '../common/entity';

export const PerformanceProfileSchema = z.object({
  id: z.string(),
  labelName: z.string(),
  descriptionText: z.string().optional(),
  databaseProvider: z.string(),
  databaseVersion: z.string(),
  /** CPU allocation in millicores (e.g. 500 = 0.5 vCPU). */
  minCpu: z.number().int().nonnegative(),
  /** Memory allocation in MB. */
  minMemory: z.number().int().nonnegative(),
  configFlags: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSeed: z.boolean().default(false),
  /** null = public catalog row; UUID = account-private row. */
  accountId: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PerformanceProfile = z.infer<typeof PerformanceProfileSchema>;

@Exclude()
export class PerformanceProfileEntity extends Entity<
  string,
  typeof PerformanceProfileSchema
> {
  @Expose()
  declare public id: string;
  @Expose()
  public labelName!: string;
  @Expose()
  public descriptionText?: string;
  @Expose()
  public databaseProvider!: string;
  @Expose()
  public databaseVersion!: string;
  @Expose()
  public minCpu!: number;
  @Expose()
  public minMemory!: number;
  @Expose()
  public configFlags?: Record<string, unknown>;
  @Expose()
  public isDefault!: boolean;
  @Expose()
  public isActive!: boolean;
  @Expose()
  public isSeed!: boolean;
  @Expose()
  public accountId?: string | null;
  @Expose()
  public createdAt!: string;
  @Expose()
  public updatedAt!: string;

  public static fromPlain(data: PerformanceProfile): PerformanceProfileEntity {
    return plainToClass(PerformanceProfileEntity, data);
  }
}
