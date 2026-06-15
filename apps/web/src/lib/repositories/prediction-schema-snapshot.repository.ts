import type { PredictionSchemaSnapshot } from '@qlm/domain/entities';
import { IPredictionSchemaSnapshotRepository } from '@qlm/domain/repositories';

import { apiGet, apiPost } from './api-client';

type WireSnapshot = Omit<PredictionSchemaSnapshot, 'takenAt'> & {
  takenAt: string;
};

function fromWire(s: WireSnapshot): PredictionSchemaSnapshot {
  return { ...s, takenAt: new Date(s.takenAt) };
}

export class PredictionSchemaSnapshotHttpRepository extends IPredictionSchemaSnapshotRepository {
  public async create(
    snapshot: PredictionSchemaSnapshot,
  ): Promise<PredictionSchemaSnapshot> {
    const wire = await apiPost<WireSnapshot>(
      `/predictions/snapshots`,
      snapshot,
    );
    return fromWire(wire);
  }

  public async findById(id: string): Promise<PredictionSchemaSnapshot | null> {
    const wire = await apiGet<WireSnapshot>(
      `/predictions/snapshots/${id}`,
      true,
    );
    return wire ? fromWire(wire) : null;
  }

  public async listByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot[]> {
    const wire = await apiGet<WireSnapshot[]>(
      `/predictions/datasources/${datasourceId}/snapshots`,
      false,
    );
    return (wire ?? []).map(fromWire);
  }

  public async findLatestByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot | null> {
    const wire = await apiGet<WireSnapshot | null>(
      `/predictions/datasources/${datasourceId}/snapshots/latest`,
      true,
    );
    return wire ? fromWire(wire) : null;
  }
}
