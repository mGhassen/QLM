import type { PredictionSchemaSnapshot } from '../entities';

/**
 * Append-only repository for schema snapshots. No `update` / `delete` —
 * snapshots are immutable by design (RFC 0030 §5.2).
 */
export abstract class IPredictionSchemaSnapshotRepository {
  public abstract create(
    snapshot: PredictionSchemaSnapshot,
  ): Promise<PredictionSchemaSnapshot>;
  public abstract findById(
    id: string,
  ): Promise<PredictionSchemaSnapshot | null>;
  public abstract listByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot[]>;
  public abstract findLatestByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot | null>;
}
