import type { OrderItem } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IOrderItemRepository extends RepositoryPort<
  OrderItem,
  string
> {
  public abstract findByOrderId(orderId: string): Promise<OrderItem[]>;
}
