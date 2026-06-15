import { z } from 'zod';

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  priceAmount: z.number().nullable(),
  quantity: z.number().int().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
