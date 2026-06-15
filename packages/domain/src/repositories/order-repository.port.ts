import { Order } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IOrderRepository extends RepositoryPort<Order, string> {
  /**
   * Find all orders for a specific organization
   */
  abstract findByOrganizationId(organizationId: string): Promise<Order[]>;
}
