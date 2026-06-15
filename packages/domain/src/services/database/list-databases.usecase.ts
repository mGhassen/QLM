import { IDatabaseRepository } from '../../repositories';
import {
  DatabaseOutput as DatabaseOutputCtor,
  type DatabaseOutput,
  type ListDatabasesInput,
} from '../../usecases/dto/database-usecase-dto';
import type { ListDatabasesUseCase } from '../../usecases/database/list-databases.usecase';

export class ListDatabasesService implements ListDatabasesUseCase {
  constructor(private readonly repo: IDatabaseRepository) {}

  public async execute(input: ListDatabasesInput): Promise<DatabaseOutput[]> {
    const databases = input.accountId
      ? await this.repo.findByAccountId(input.accountId)
      : await this.repo.findAll();
    return databases.map((db) => DatabaseOutputCtor.new(db));
  }
}
