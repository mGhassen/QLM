import { ITeamMemberRepository } from '../../repositories';
import {
  InviteTeamMemberInput,
  InviteTeamMemberOutput,
  InviteTeamMemberUseCase,
} from '../../usecases';

export class InviteTeamMemberService implements InviteTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(
    input: InviteTeamMemberInput,
  ): Promise<InviteTeamMemberOutput> {
    return this.teamMemberRepository.inviteTeamMember(input);
  }
}
