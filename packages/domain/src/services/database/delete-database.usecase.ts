import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IDatabaseRepository } from '../../repositories';
import type { DeleteDatabaseUseCase } from '../../usecases/database/delete-database.usecase';

export class DeleteDatabaseService implements DeleteDatabaseUseCase {
  constructor(private readonly repo: IDatabaseRepository) {}

  public async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw DomainException.new({
        code: Code.ENTITY_NOT_FOUND_ERROR,
        overrideMessage: `Database with id '${id}' not found`,
        data: { databaseId: id },
      });
    }
    await this.repo.delete(id);
  }
}
