import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { OrderItem } from '@qlm/domain/entities';
import { IOrderItemRepository } from '@qlm/domain/repositories';

export class OrderItemRepository extends IOrderItemRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<OrderItem[]> {
    return [];
  }

  async findById(_id: string): Promise<OrderItem | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<OrderItem | null> {
    return null;
  }

  async create(_entity: OrderItem): Promise<OrderItem> {
    throw new Error(
      'Order items cannot be created in memory repository (server-side only)',
    );
  }

  async update(_entity: OrderItem): Promise<OrderItem> {
    throw new Error(
      'Order items cannot be updated in memory repository (server-side only)',
    );
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'Order items cannot be deleted in memory repository (server-side only)',
    );
  }

  async findByOrderId(_orderId: string): Promise<OrderItem[]> {
    return [];
  }
}
