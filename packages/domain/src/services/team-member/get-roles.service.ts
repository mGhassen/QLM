import { ITeamMemberRepository } from '../../repositories';
import { GetRolesOutput, GetRolesUseCase } from '../../usecases';

export class GetRolesService implements GetRolesUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(): Promise<GetRolesOutput> {
    return this.teamMemberRepository.getRoles();
  }
}
