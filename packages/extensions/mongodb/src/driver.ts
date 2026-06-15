import { MongoClient, type Db, type Document } from 'mongodb';
import type { z } from 'zod';

import type {
  DatasourceMetadata,
  DatasourceResultSet,
  DriverContext,
  IDataSourceDriver,
} from '@qlm/extensions-sdk';
import {
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  DatasourceMetadataZodSchema,
  withTimeout,
} from '@qlm/extensions-sdk';

import { schema } from './schema';

type Config = z.infer<typeof schema>;

type TableEntry = {
  id: number;
  schema: string;
  name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  bytes: number;
  size: string;
  live_rows_estimate: number;
  dead_rows_estimate: number;
  comment: string | null;
  primary_keys: never[];
  relationships: never[];
};

type ColumnEntry = {
  id: string;
  table_id: number;
  schema: string;
  table: string;
  name: string;
  ordinal_position: number;
  data_type: string;
  format: string;
  is_identity: boolean;
  identity_generation: null;
  is_generated: boolean;
  is_nullable: boolean;
  is_updatable: boolean;
  is_unique: boolean;
  check: null;
  default_value: null;
  enums: never[];
  comment: null;
};

/** Infer a loose data type from a JS runtime value. */
function inferType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  if (t === 'object') return 'object';
  return t;
}

/**
 * Parse the `database` name from either the explicit config field or the
 * path of a mongodb URI. Returns `undefined` when neither is present — in
 * that case the driver falls back to MongoDB's default database ("test").
 */
function resolveDatabaseName(
  connectionUrl: string,
  explicit?: string,
): string | undefined {
  if (explicit && explicit.length > 0) return explicit;
  try {
    const url = new URL(connectionUrl);
    const pathname = url.pathname.replace(/^\//, '');
    if (pathname.length > 0) return pathname;
  } catch {
    // Fall through — some SRV URIs may not be URL-parseable in every runtime.
  }
  return undefined;
}

export function makeMongoDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config) as Config;
  const connectionUrl = parsedConfig.connectionUrl;
  const explicitDatabase = parsedConfig.database;

  const withDb = async <T>(
    callback: (db: Db, client: MongoClient) => Promise<T>,
    timeoutMs: number = DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  ): Promise<T> => {
    const operation = (async () => {
      const client = new MongoClient(connectionUrl, {
        serverSelectionTimeoutMS: timeoutMs,
      });
      try {
        await client.connect();
        const dbName = resolveDatabaseName(connectionUrl, explicitDatabase);
        const db = dbName ? client.db(dbName) : client.db();
        return await callback(db, client);
      } finally {
        await client.close();
      }
    })();

    return withTimeout(
      operation,
      timeoutMs,
      `MongoDB connection operation timed out after ${timeoutMs}ms`,
    );
  };

  return {
    async testConnection(): Promise<void> {
      await withDb(
        async (db) => {
          await db.command({ ping: 1 });
        },
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
      );
      context.logger?.info?.('mongodb: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      return withDb(async (db) => {
        const dbName = db.databaseName;
        const collections = await db.listCollections({}, { nameOnly: true }).toArray();

        const tables: TableEntry[] = [];
        const columns: ColumnEntry[] = [];

        let tableIdCounter = 0;
        for (const coll of collections) {
          tableIdCounter += 1;
          const tableId = tableIdCounter;
          const collection = db.collection(coll.name);

          let rowCount = 0;
          try {
            rowCount = await collection.estimatedDocumentCount();
          } catch {
            rowCount = 0;
          }

          tables.push({
            id: tableId,
            schema: dbName,
            name: coll.name,
            rls_enabled: false,
            rls_forced: false,
            bytes: 0,
            size: String(rowCount),
            live_rows_estimate: rowCount,
            dead_rows_estimate: 0,
            comment: null,
            primary_keys: [],
            relationships: [],
          });

          // Sample one document to infer a flat column shape.
          let sample: Document | null = null;
          try {
            sample = await collection.findOne({});
          } catch {
            sample = null;
          }

          if (sample) {
            const entries = Object.entries(sample);
            entries.forEach(([field, value], idx) => {
              const isId = field === '_id';
              columns.push({
                id: `${dbName}.${coll.name}.${field}`,
                table_id: tableId,
                schema: dbName,
                table: coll.name,
                name: field,
                ordinal_position: idx + 1,
                data_type: inferType(value),
                format: inferType(value),
                is_identity: isId,
                identity_generation: null,
                is_generated: false,
                is_nullable: !isId,
                is_updatable: !isId,
                is_unique: isId,
                check: null,
                default_value: null,
                enums: [],
                comment: null,
              });
            });
          }
        }

        const schemas = [{ id: 1, name: dbName, owner: 'unknown' }];

        return DatasourceMetadataZodSchema.parse({
          version: '0.0.1',
          driver: 'mongodb.default',
          schemas,
          tables,
          columns,
        });
      });
    },

    /**
     * Placeholder query interface. MongoDB has no SQL; the `sql` input is
     * expected to be a JSON-encoded command accepted by `db.command()` —
     * e.g. `{ "find": "users", "limit": 10 }`. A full query editor
     * (aggregation pipelines, collection browsing) is a follow-up.
     */
    async query(sql: string): Promise<DatasourceResultSet> {
      let command: Document;
      try {
        command = JSON.parse(sql) as Document;
      } catch (error) {
        throw new Error(
          'MongoDB driver expects a JSON command, e.g. { "find": "users", "limit": 10 }. ' +
            `Got parse error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return withDb(async (db) => {
        const startTime = Date.now();
        const result = (await db.command(command)) as Document & {
          cursor?: { firstBatch?: Document[] };
        };
        const endTime = Date.now();

        const rows: Document[] = result.cursor?.firstBatch ?? [];
        const firstRow = rows[0] ?? {};
        const columns = Object.keys(firstRow).map((name) => ({
          name,
          displayName: name,
          originalType: inferType((firstRow as Record<string, unknown>)[name]),
        }));

        return {
          columns,
          rows: rows as Array<Record<string, unknown>>,
          stat: {
            rowsAffected: rows.length,
            rowsRead: rows.length,
            rowsWritten: 0,
            queryDurationMs: endTime - startTime,
          },
        };
      });
    },

    async close() {
      context.logger?.info?.('mongodb: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeMongoDriver;
export default driverFactory;
