import type { Database } from '../entities';

export abstract class IDatabaseRepository {
  /** All databases for the current authenticated user (RLS-scoped). */
  abstract findAll(): Promise<Database[]>;
  abstract findByAccountId(accountId: string): Promise<Database[]>;
  abstract findById(id: string): Promise<Database | null>;
  abstract create(entity: Database): Promise<Database>;
  abstract update(entity: Database): Promise<Database>;
  /** Soft-delete: sets `status = 'deleted'` on the deployment_request row. */
  abstract delete(id: string): Promise<void>;
}
