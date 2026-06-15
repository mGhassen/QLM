import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { Usage } from '@qlm/domain/entities';
import { IUsageRepository } from '@qlm/domain/repositories';
import type {
  GetUsageSummaryInput,
  GetUsageSummaryOutput,
  TopProjectUsage,
  TopUserUsage,
} from '@qlm/domain/usecases';
import type { SupabaseClientType } from './types';

export class UsageRepository extends IUsageRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(usage: Usage, includeId = true): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      conversation_id: usage.conversationId,
      project_id: usage.projectId,
      organization_id: usage.organizationId,
      user_id: usage.userId,
      model: usage.model,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      total_tokens: usage.totalTokens ?? 0,
      reasoning_tokens: usage.reasoningTokens ?? 0,
      cached_input_tokens: usage.cachedInputTokens ?? 0,
      context_size: usage.contextSize ?? 0,
      credits_cap: usage.creditsCap ?? 0,
      credits_used: usage.creditsUsed ?? 0,
      cpu: usage.cpu ?? 0,
      memory: usage.memory ?? 0,
      network: usage.network ?? 0,
      gpu: usage.gpu ?? 0,
      storage: usage.storage ?? 0,
      cost: usage.cost ?? 0,
      created_at: usage.timestamp ?? new Date(),
    };

    // Only include ID if explicitly provided and includeId is true
    // This allows the database to auto-generate IDs using bigserial
    if (includeId && usage.id && usage.id.trim() !== '') {
      serialized.id = usage.id;
    }

    return serialized;
  }

  private deserialize(row: Record<string, unknown>): Usage {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      projectId: row.project_id as string,
      organizationId: row.organization_id as string,
      userId: row.user_id as string,
      model: row.model as string,
      inputTokens: (row.input_tokens as number) || 0,
      outputTokens: (row.output_tokens as number) || 0,
      totalTokens: (row.total_tokens as number) || 0,
      reasoningTokens: (row.reasoning_tokens as number) || 0,
      cachedInputTokens: (row.cached_input_tokens as number) || 0,
      contextSize: (row.context_size as number) || 0,
      creditsCap: (row.credits_cap as number) || 0,
      creditsUsed: (row.credits_used as number) || 0,
      cpu: (row.cpu as number) || 0,
      memory: (row.memory as number) || 0,
      network: (row.network as number) || 0,
      gpu: (row.gpu as number) || 0,
      storage: (row.storage as number) || 0,
      cost: (row.cost as number) || 0,
      timestamp: new Date(row.created_at as string),
    } as Usage;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    let query = this.client.from('usage').select('*');

    if (options?.order) {
      const [column, direction] = options.order.split(' ');
      if (column) {
        query = query.order(column, {
          ascending: direction?.toUpperCase() !== 'DESC',
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      // Default to time series order (newest first for time series data)
      query = query.order('created_at', { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 1000) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Usage | null> {
    const { data, error } = await this.client
      .from('usage')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(_slug: string): Promise<Usage | null> {
    // Usage doesn't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Usage[]> {
    const { data, error } = await this.client
      .from('usage')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch usage by conversation: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findByConversationSlug(conversationSlug: string): Promise<Usage[]> {
    // First, get the conversation ID from the slug
    const { data: conversation } = await this.client
      .from('conversations')
      .select('id')
      .eq('slug', conversationSlug)
      .single();

    if (!conversation) {
      return [];
    }

    // Then find usage by conversation ID
    return this.findByConversationId(conversation.id);
  }

  async create(entity: Usage): Promise<Usage> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create usage');
    }

    // Use authenticated user if userId is not provided or is empty/invalid
    const userId =
      entity.userId &&
      entity.userId.trim() !== '' &&
      entity.userId !== 'system' &&
      entity.userId !== 'agent'
        ? entity.userId
        : user.id;

    const entityWithUserId = {
      ...entity,
      userId,
    };

    // Omit ID to let the database auto-generate timestamp-based ID via trigger
    // The trigger uses qwery.generate_usage_timestamp_id() for time-series ordering
    // Only include ID if explicitly provided (for edge cases)
    const serialized = this.serialize(entityWithUserId, false);

    const { data, error } = await this.client
      .from('usage')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create usage: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(_entity: Usage): Promise<Usage> {
    // Usage records are immutable - updates are not allowed
    throw new Error('Usage records cannot be updated');
  }

  async delete(_id: string): Promise<boolean> {
    // Usage records are immutable - deletes are not allowed
    throw new Error('Usage records cannot be deleted');
  }

  /**
   * Organization consumption summary, ported from qwery's usage.tsx loader.
   *
   * Queries `credits_transactions` (filtered to `transaction_type =
   * 'consumption'` and optional ISO-8601 `from`/`to` window) in parallel
   * with the `organizations` row for balance totals, then aggregates by
   * user and project and resolves names. Returns zeros on any error so the
   * UI can render gracefully without a thrown exception.
   */
  async getUsageSummary(
    input: GetUsageSummaryInput,
  ): Promise<GetUsageSummaryOutput> {
    const empty: GetUsageSummaryOutput = {
      balance: 0,
      totalConsumed: 0,
      totalPurchased: 0,
      periodConsumed: 0,
      topUsers: [],
      topProjects: [],
    };

    try {
      let consumptionQuery = this.client
        .from('credits_transactions')
        .select('credits_amount, user_id, project_id')
        .eq('organization_id', input.organizationId)
        .eq('transaction_type', 'consumption');

      if (input.from) {
        consumptionQuery = consumptionQuery.gte('created_at', input.from);
      }
      if (input.to) {
        consumptionQuery = consumptionQuery.lte('created_at', input.to);
      }

      const [orgRow, consumptionTx] = await Promise.all([
        this.client
          .from('organizations')
          .select(
            'credits_balance, credits_total_consumed, credits_total_purchased',
          )
          .eq('id', input.organizationId)
          .single(),
        consumptionQuery,
      ]);

      if (orgRow.error || !orgRow.data) {
        return empty;
      }

      const orgData = orgRow.data as unknown as {
        credits_balance?: number | null;
        credits_total_consumed?: number | null;
        credits_total_purchased?: number | null;
      };

      const balance = Number(orgData.credits_balance ?? 0);
      const totalConsumed = Number(orgData.credits_total_consumed ?? 0);
      const totalPurchased = Number(orgData.credits_total_purchased ?? 0);

      const txData = (consumptionTx.data ?? []) as Array<{
        credits_amount: number | string;
        user_id: string | null;
        project_id: string | null;
      }>;

      const periodConsumed = txData.reduce(
        (sum, row) => sum + Math.abs(Number(row.credits_amount)),
        0,
      );

      const byUser = new Map<string, number>();
      const byProject = new Map<string, number>();
      for (const row of txData) {
        const amount = Math.abs(Number(row.credits_amount));
        if (row.user_id) {
          byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + amount);
        }
        if (row.project_id) {
          byProject.set(
            row.project_id,
            (byProject.get(row.project_id) ?? 0) + amount,
          );
        }
      }

      const userIds = Array.from(byUser.keys());
      const projectIds = Array.from(byProject.keys());

      const [usersResult, projectsResult] = await Promise.all([
        userIds.length
          ? this.client.from('accounts').select('id, name').in('id', userIds)
          : Promise.resolve({
              data: [] as Array<{ id: string; name: string | null }>,
              error: null,
            }),
        projectIds.length
          ? this.client.from('projects').select('id, name').in('id', projectIds)
          : Promise.resolve({
              data: [] as Array<{ id: string; name: string | null }>,
              error: null,
            }),
      ]);

      const userNameById = new Map<string, string>();
      for (const user of usersResult.data ?? []) {
        if (user.name) userNameById.set(user.id, user.name);
      }

      const projectNameById = new Map<string, string>();
      for (const project of projectsResult.data ?? []) {
        if (project.name) projectNameById.set(project.id, project.name);
      }

      const topUsers: TopUserUsage[] = Array.from(byUser.entries())
        .map(([userId, credits]) => ({
          userId,
          userName: userNameById.get(userId) ?? null,
          credits,
        }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 10);

      const topProjects: TopProjectUsage[] = Array.from(byProject.entries())
        .map(([projectId, credits]) => ({
          projectId,
          projectName: projectNameById.get(projectId) ?? null,
          credits,
        }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 10);

      return {
        balance,
        totalConsumed,
        totalPurchased,
        periodConsumed,
        topUsers,
        topProjects,
      };
    } catch (error) {
      console.error('[usage] getUsageSummary failed:', error);
      return empty;
    }
  }
}
