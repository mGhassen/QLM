import { ITeamMemberRepository } from '../../repositories';
import {
  GetTeamMembersInput,
  GetTeamMembersOutput,
  GetTeamMembersUseCase,
} from '../../usecases';

export class GetTeamMembersService implements GetTeamMembersUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(
    input: GetTeamMembersInput,
  ): Promise<GetTeamMembersOutput> {
    return this.teamMemberRepository.getTeamMembers(input);
  }
}
