import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { OrderItem } from '@guepard/domain/entities';
import { IOrderItemRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';

export class OrderItemRepository extends IOrderItemRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserialize(row: Record<string, unknown>): OrderItem {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      productId: row.product_id as string,
      variantId: row.variant_id as string,
      priceAmount: row.price_amount != null ? Number(row.price_amount) : null,
      quantity: (row.quantity as number) ?? 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async findAll(_options?: RepositoryFindOptions): Promise<OrderItem[]> {
    throw new Error('Unsupported');
  }

  async findById(_id: string): Promise<OrderItem | null> {
    throw new Error('Unsupported');
  }

  async findBySlug(_slug: string): Promise<OrderItem | null> {
    throw new Error('Unsupported');
  }

  async create(_entity: OrderItem): Promise<OrderItem> {
    throw new Error('Unsupported');
  }

  async update(_entity: OrderItem): Promise<OrderItem> {
    throw new Error('Unsupported');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Unsupported');
  }

  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await this.client
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch order items by order: ${error.message}`);
    }
    return (data ?? []).map((row) => this.deserialize(row));
  }
}
