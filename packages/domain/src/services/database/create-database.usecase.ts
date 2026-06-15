import { IDatabaseRepository } from '../../repositories';
import { DatabaseEntity } from '../../entities';
import {
  DatabaseOutput as DatabaseOutputCtor,
  type CreateDatabaseInput,
  type DatabaseOutput,
} from '../../usecases/dto/database-usecase-dto';
import type { CreateDatabaseUseCase } from '../../usecases/database/create-database.usecase';

export class CreateDatabaseService implements CreateDatabaseUseCase {
  constructor(private readonly repo: IDatabaseRepository) {}

  public async execute(input: CreateDatabaseInput): Promise<DatabaseOutput> {
    const entity = DatabaseEntity.create(input);
    const created = await this.repo.create(entity);
    return DatabaseOutputCtor.new(created);
  }
}
