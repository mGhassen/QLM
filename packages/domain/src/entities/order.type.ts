import { Entity } from '../common/entity';
import { z } from 'zod';
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';

/**
 * Order schema
 * Represents a one-time payment order (e.g., credit purchase)
 */
export const OrderSchema = z.object({
  id: z.string().describe('The order ID (usually from billing provider)'),
  organizationId: z
    .string()
    .uuid()
    .describe('The organization this order belongs to'),
  customerId: z
    .string()
    .describe('The billing-provider customer reference (e.g. Stripe cus_…)'),
  status: z
    .enum(['succeeded', 'pending', 'failed'])
    .describe('The payment status of the order'),
  billingProvider: z
    .enum(['stripe', 'lemon_squeezy', 'paddle'])
    .describe('The billing provider'),
  totalAmount: z.number().describe('Total amount in cents'),
  currency: z.string().length(3).describe('Currency code (e.g., USD)'),
  createdAt: z.date().describe('The date and time the order was created'),
  updatedAt: z.date().describe('The date and time the order was last updated'),
});

export type Order = z.infer<typeof OrderSchema>;

@Exclude()
export class OrderEntity extends Entity<string, typeof OrderSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public organizationId!: string;
  @Expose()
  public customerId!: string;
  @Expose()
  public status!: 'succeeded' | 'pending' | 'failed';
  @Expose()
  public billingProvider!: 'stripe' | 'lemon_squeezy' | 'paddle';
  @Expose()
  public totalAmount!: number;
  @Expose()
  public currency!: string;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;

  public static fromData(data: Order): OrderEntity {
    return plainToClass(OrderEntity, OrderSchema.parse(data));
  }
}
