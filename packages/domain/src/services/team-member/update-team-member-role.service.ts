import { ITeamMemberRepository } from '../../repositories';
import {
  UpdateTeamMemberRoleInput,
  UpdateTeamMemberRoleOutput,
  UpdateTeamMemberRoleUseCase,
} from '../../usecases';

export class UpdateTeamMemberRoleService implements UpdateTeamMemberRoleUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(
    input: UpdateTeamMemberRoleInput,
  ): Promise<UpdateTeamMemberRoleOutput> {
    return this.teamMemberRepository.updateTeamMemberRole(input);
  }
}
