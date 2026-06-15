import type { QueryClient } from '@tanstack/react-query';

import type { Order } from '@qlm/domain/entities';
import type { IOrderRepository } from '@qlm/domain/repositories';
import { GetOrdersByOrganizationIdService } from '@qlm/domain/services';

export function createOrdersResource(
  repository: IOrderRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['orders'] as const,
    listByOrganization: (organizationId: string) =>
      ['orders', 'organization', organizationId] as const,
  };

  return {
    keys,

    async list(params: { organizationId: string }): Promise<Order[]> {
      return new GetOrdersByOrganizationIdService(repository).execute(
        params.organizationId,
      );
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      listByOrganization: (organizationId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByOrganization(organizationId),
        }),
    },
  };
}

export type OrdersResource = ReturnType<typeof createOrdersResource>;
