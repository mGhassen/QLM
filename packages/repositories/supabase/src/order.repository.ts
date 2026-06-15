import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { Order } from '@guepard/domain/entities';
import { IOrderRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';

export class OrderRepository extends IOrderRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserialize(row: Record<string, unknown>): Order {
    // Map database format (lemon-squeezy) to domain format (lemon_squeezy)
    const billingProvider = row.billing_provider as string;
    const mappedProvider =
      billingProvider === 'lemon-squeezy'
        ? 'lemon_squeezy'
        : (billingProvider as 'stripe' | 'paddle');

    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      customerId: row.customer_id as string,
      status: row.status as 'succeeded' | 'pending' | 'failed',
      billingProvider: mappedProvider,
      totalAmount: Number(row.total_amount),
      currency: row.currency as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async findAll(options?: RepositoryFindOptions): Promise<Order[]> {
    let query = this.client.from('orders').select('*');

    if (options?.order) {
      const [field, direction] = options.order.split(' ');
      if (field) {
        query = query.order(field, { ascending: direction !== 'DESC' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(_slug: string): Promise<Order | null> {
    // Orders don't have slugs
    return null;
  }

  async create(entity: Order): Promise<Order> {
    // Map domain format (lemon_squeezy) to database format (lemon-squeezy)
    const billingProvider =
      entity.billingProvider === 'lemon_squeezy'
        ? 'lemon-squeezy'
        : entity.billingProvider;

    const serialized = {
      id: entity.id,
      organization_id: entity.organizationId,
      customer_id: entity.customerId,
      status: entity.status,
      billing_provider: billingProvider,
      total_amount: entity.totalAmount,
      currency: entity.currency,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };

    const { data, error } = await this.client
      .from('orders')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Order): Promise<Order> {
    const serialized = {
      status: entity.status,
      total_amount: entity.totalAmount,
      updated_at: entity.updatedAt.toISOString(),
    };

    const { data, error } = await this.client
      .from('orders')
      .update(serialized)
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Order with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client.from('orders').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }

    return true;
  }

  async findByOrganizationId(organizationId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch orders by organization: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserialize(row));
  }
}
