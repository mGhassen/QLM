import { ITeamMemberRepository } from '../../repositories';
import {
  RemoveTeamMemberInput,
  RemoveTeamMemberOutput,
  RemoveTeamMemberUseCase,
} from '../../usecases';

export class RemoveTeamMemberService implements RemoveTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(
    input: RemoveTeamMemberInput,
  ): Promise<RemoveTeamMemberOutput> {
    return this.teamMemberRepository.removeTeamMember(input);
  }
}
