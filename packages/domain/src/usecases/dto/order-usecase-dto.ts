import { Order } from '../../entities/order.type';

/**
 * DTOs for the order use cases.
 *
 * Shape derived from the existing GetOrdersByOrganizationIdService
 * at packages/domain/src/services/order/get-orders.service.ts.
 */

export type GetOrdersByOrganizationIdInput = string;
export type GetOrdersByOrganizationIdOutput = Order[];

export interface GetOrdersByOrganizationIdUseCase {
  execute(
    input: GetOrdersByOrganizationIdInput,
  ): Promise<GetOrdersByOrganizationIdOutput>;
}
