import { IOrderRepository } from '../../repositories';
import { GetOrdersByOrganizationIdUseCase } from '../../usecases';
import { Order } from '../../entities';

export class GetOrdersByOrganizationIdService implements GetOrdersByOrganizationIdUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  public async execute(organizationId: string): Promise<Order[]> {
    return this.orderRepository.findByOrganizationId(organizationId);
  }
}
