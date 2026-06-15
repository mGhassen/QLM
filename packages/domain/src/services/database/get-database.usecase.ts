import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IDatabaseRepository } from '../../repositories';
import {
  DatabaseOutput as DatabaseOutputCtor,
  type DatabaseOutput,
} from '../../usecases/dto/database-usecase-dto';
import type { GetDatabaseUseCase } from '../../usecases/database/get-database.usecase';

export class GetDatabaseService implements GetDatabaseUseCase {
  constructor(private readonly repo: IDatabaseRepository) {}

  public async execute(id: string): Promise<DatabaseOutput> {
    const database = await this.repo.findById(id);
    if (!database) {
      throw DomainException.new({
        code: Code.ENTITY_NOT_FOUND_ERROR,
        overrideMessage: `Database with id '${id}' not found`,
        data: { databaseId: id },
      });
    }
    return DatabaseOutputCtor.new(database);
  }
}
