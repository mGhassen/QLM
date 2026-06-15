import { Usage } from '../../entities';
import type {
  GetUsageSummaryInput,
  GetUsageSummaryOutput,
} from '../../usecases/dto/ai/usage-usecase-dto';
import { RepositoryPort } from '../base-repository.port';

export abstract class IUsageRepository extends RepositoryPort<Usage, string> {
  public abstract findByConversationId(
    conversationId: string,
  ): Promise<Usage[]>;

  public abstract findByConversationSlug(
    conversationSlug: string,
  ): Promise<Usage[]>;

  /**
   * Return an organization-level consumption summary: balance, totals,
   * and top-10 users/projects by consumed credits. Filters by optional
   * ISO-8601 `from`/`to` window.
   */
  public abstract getUsageSummary(
    input: GetUsageSummaryInput,
  ): Promise<GetUsageSummaryOutput>;
}
