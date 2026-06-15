import { Exclude, Expose, plainToClass } from 'class-transformer';

import type { PerformanceProfile } from '../../entities';

@Exclude()
export class PerformanceProfileOutput {
  @Expose() public id!: string;
  @Expose() public labelName!: string;
  @Expose() public descriptionText?: string;
  @Expose() public databaseProvider!: string;
  @Expose() public databaseVersion!: string;
  @Expose() public minCpu!: number;
  @Expose() public minMemory!: number;
  @Expose() public configFlags?: Record<string, unknown>;
  @Expose() public isDefault!: boolean;
  @Expose() public isActive!: boolean;
  @Expose() public isSeed!: boolean;
  @Expose() public accountId?: string | null;
  @Expose() public createdAt!: string;
  @Expose() public updatedAt!: string;

  public static new(profile: PerformanceProfile): PerformanceProfileOutput {
    return plainToClass(PerformanceProfileOutput, profile);
  }
}
