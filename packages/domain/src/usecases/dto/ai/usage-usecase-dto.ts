import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Usage } from '../../../entities';

@Exclude()
export class UsageOutput {
  @Expose()
  public id!: number;
  @Expose()
  public conversationId!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public organizationId!: string;
  @Expose()
  public userId!: string;
  @Expose()
  public model!: string;
  @Expose()
  public inputTokens!: number;
  @Expose()
  public outputTokens!: number;
  @Expose()
  public totalTokens!: number;
  @Expose()
  public reasoningTokens!: number;
  @Expose()
  public cachedInputTokens!: number;
  @Expose()
  public cost!: number;
  @Expose()
  public contextSize!: number;
  @Expose()
  public creditsCap!: number;
  @Expose()
  public creditsUsed!: number;
  @Expose()
  public cpu!: number;
  @Expose()
  public memory!: number;
  @Expose()
  public network!: number;
  @Expose()
  public gpu!: number;
  @Expose()
  public storage!: number;

  public static new(usage: Usage): UsageOutput {
    return plainToClass(UsageOutput, usage);
  }
}

export type CreateUsageInput = {
  id?: string;
  conversationId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens: number;
  cachedInputTokens: number;
  cost: number;
  contextSize: number;
  creditsCap: number;
  creditsUsed: number;
  cpu: number;
  memory: number;
  network: number;
  gpu: number;
  storage: number;
};

/**
 * Organization-level consumption summary, as rendered on the usage page.
 * Shape mirrors qwery's usage loader return value so the UI can be ported 1:1.
 */
export type GetUsageSummaryInput = {
  organizationId: string;
  from?: string; // ISO-8601 date, inclusive lower bound
  to?: string; // ISO-8601 date, inclusive upper bound
};

export type TopUserUsage = {
  userId: string;
  userName: string | null;
  credits: number;
};

export type TopProjectUsage = {
  projectId: string;
  projectName: string | null;
  credits: number;
};

export type UsageSummary = {
  balance: number;
  totalConsumed: number;
  totalPurchased: number;
  periodConsumed: number;
  topUsers: TopUserUsage[];
  topProjects: TopProjectUsage[];
};

export type GetUsageSummaryOutput = UsageSummary;

export interface GetUsageSummaryUseCase {
  execute(input: GetUsageSummaryInput): Promise<GetUsageSummaryOutput>;
}
