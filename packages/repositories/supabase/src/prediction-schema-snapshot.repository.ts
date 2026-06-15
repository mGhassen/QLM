import type { PredictionSchemaSnapshot } from '@qlm/domain/entities';
import { IPredictionSchemaSnapshotRepository } from '@qlm/domain/repositories';

import type { SupabaseClientType } from './types';

const TABLE = 'prediction_schema_snapshots' as const;

type Row = {
  id: string;
  datasource_id: string;
  project_id: string;
  version: number;
  metadata: unknown;
  taken_by: string;
  taken_at: string;
};

function deserialize(row: Row): PredictionSchemaSnapshot {
  return {
    id: row.id,
    datasourceId: row.datasource_id,
    projectId: row.project_id,
    version: row.version,
    metadata: row.metadata as PredictionSchemaSnapshot['metadata'],
    takenBy: row.taken_by,
    takenAt: new Date(row.taken_at),
  };
}

export class PredictionSchemaSnapshotRepository extends IPredictionSchemaSnapshotRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async create(
    snapshot: PredictionSchemaSnapshot,
  ): Promise<PredictionSchemaSnapshot> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        id: snapshot.id,
        datasource_id: snapshot.datasourceId,
        project_id: snapshot.projectId,
        version: snapshot.version,
        // jsonb column accepts any JSON-serialisable value; cast to
        // `Json` via `unknown` so TS doesn't try to narrow `metadata`.
        metadata: snapshot.metadata as unknown as Row['metadata'] as never,
        taken_by: snapshot.takenBy,
        taken_at: snapshot.takenAt.toISOString(),
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(`Failed to create prediction snapshot: ${error.message}`);
    }
    return deserialize(data as Row);
  }

  public async findById(id: string): Promise<PredictionSchemaSnapshot | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch prediction snapshot: ${error.message}`);
    }
    return data ? deserialize(data as Row) : null;
  }

  public async listByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('datasource_id', datasourceId)
      .order('version', { ascending: false });
    if (error) {
      throw new Error(`Failed to list prediction snapshots: ${error.message}`);
    }
    return ((data as Row[] | null) ?? []).map((row) => deserialize(row));
  }

  public async findLatestByDatasource(
    datasourceId: string,
  ): Promise<PredictionSchemaSnapshot | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('datasource_id', datasourceId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(
        `Failed to fetch latest prediction snapshot: ${error.message}`,
      );
    }
    return data ? deserialize(data as Row) : null;
  }
}
