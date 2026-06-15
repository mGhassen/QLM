import type { Pool } from '../../entities/pool.type';
import type { UseCase } from '../usecase';

export type ListPoolsInput = {
  projectId: string;
};

export type ListPoolsOutput = {
  items: Pool[];
};

export type ListPoolsByProjectUseCase = UseCase<
  ListPoolsInput,
  ListPoolsOutput
>;
