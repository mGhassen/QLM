import type { QueryClient } from '@tanstack/react-query';

import type { IUsageRepository } from '@qlm/domain/repositories';
import { GetUsageSummaryService } from '@qlm/domain/services';
import type {
  GetUsageSummaryInput,
  UsageSummary,
} from '@qlm/domain/usecases';

export function createUsageResource(
  repository: IUsageRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['usage'] as const,
    summary: (
      organizationId: string,
      from?: string,
      to?: string,
    ) => ['usage', 'summary', organizationId, from ?? null, to ?? null] as const,
  };

  return {
    keys,

    async getSummary(input: GetUsageSummaryInput): Promise<UsageSummary> {
      return new GetUsageSummaryService(repository).execute(input);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      summary: (organizationId: string) =>
        queryClient.invalidateQueries({
          queryKey: ['usage', 'summary', organizationId],
        }),
    },
  };
}

export type UsageResource = ReturnType<typeof createUsageResource>;
