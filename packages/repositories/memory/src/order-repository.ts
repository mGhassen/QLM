import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { Order } from '@guepard/domain/entities';
import { IOrderRepository } from '@guepard/domain/repositories';

export class OrderRepository extends IOrderRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Order[]> {
    // Memory repository doesn't support orders (server-side only)
    return [];
  }

  async findById(_id: string): Promise<Order | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<Order | null> {
    return null;
  }

  async create(_entity: Order): Promise<Order> {
    throw new Error(
      'Orders cannot be created in memory repository (server-side only)',
    );
  }

  async update(_entity: Order): Promise<Order> {
    throw new Error(
      'Orders cannot be updated in memory repository (server-side only)',
    );
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'Orders cannot be deleted in memory repository (server-side only)',
    );
  }

  async findByOrganizationId(_organizationId: string): Promise<Order[]> {
    // Memory repository doesn't support orders (server-side only)
    return [];
  }
}
