import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IDatabaseRepository } from '../../repositories';
import { DatabaseEntity } from '../../entities';
import {
  DatabaseOutput as DatabaseOutputCtor,
  type DatabaseOutput,
  type UpdateDatabaseInput,
} from '../../usecases/dto/database-usecase-dto';
import type { UpdateDatabaseUseCase } from '../../usecases/database/update-database.usecase';

export class UpdateDatabaseService implements UpdateDatabaseUseCase {
  constructor(private readonly repo: IDatabaseRepository) {}

  public async execute(input: UpdateDatabaseInput): Promise<DatabaseOutput> {
    const existing = await this.repo.findById(input.id);
    if (!existing) {
      throw DomainException.new({
        code: Code.ENTITY_NOT_FOUND_ERROR,
        overrideMessage: `Database with id '${input.id}' not found`,
        data: { databaseId: input.id },
      });
    }
    const updated = DatabaseEntity.update(existing, input);
    const saved = await this.repo.update(updated);
    return DatabaseOutputCtor.new(saved);
  }
}
