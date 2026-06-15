import type { PerformanceProfile } from '../entities';

export abstract class IPerformanceProfileRepository {
  /** Public catalog rows only (account_id IS NULL, is_active = true). */
  abstract findPublicCatalog(): Promise<PerformanceProfile[]>;
  /** Both public catalog rows and account-private rows. */
  abstract findByAccountId(accountId: string): Promise<PerformanceProfile[]>;
  abstract findById(id: string): Promise<PerformanceProfile | null>;
}
