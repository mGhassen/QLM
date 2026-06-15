import { ITeamMemberRepository } from '../../repositories';
import {
  LeaveTeamInput,
  LeaveTeamOutput,
  LeaveTeamUseCase,
} from '../../usecases';

export class LeaveTeamService implements LeaveTeamUseCase {
  constructor(private readonly teamMemberRepository: ITeamMemberRepository) {}

  public async execute(input: LeaveTeamInput): Promise<LeaveTeamOutput> {
    return this.teamMemberRepository.leaveTeam(input);
  }
}
