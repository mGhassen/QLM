import { MongoClient } from 'mongodb';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { driverFactory } from '../src/driver';

/**
 * Integration test: boots a real MongoDB 7 container via testcontainers,
 * seeds two collections, and exercises the driver end-to-end.
 *
 * Requires Docker on the host. Run via `pnpm --filter @qlm/extension-mongodb test:integration`.
 */

const MONGO_IMAGE = 'mongo:7';
const DB_NAME = 'qlm_test';

describe('mongodb driver (integration)', () => {
  let container: StartedTestContainer;
  let connectionUrl: string;

  beforeAll(async () => {
    container = await new GenericContainer(MONGO_IMAGE)
      .withExposedPorts(27017)
      .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/i))
      .withStartupTimeout(120_000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(27017);
    connectionUrl = `mongodb://${host}:${port}/${DB_NAME}`;

    // Seed two collections with a handful of sample documents.
    const client = new MongoClient(connectionUrl);
    try {
      await client.connect();
      const db = client.db(DB_NAME);

      await db.collection('users').insertMany([
        { _id: 1 as never, name: 'Alice', age: 30, isActive: true },
        { _id: 2 as never, name: 'Bob', age: 25, isActive: false },
        { _id: 3 as never, name: 'Carol', age: 40, isActive: true },
      ]);

      await db.collection('orders').insertMany([
        { _id: 'o1' as never, userId: 1, total: 99.99, items: ['a', 'b'] },
        { _id: 'o2' as never, userId: 2, total: 42.5, items: ['c'] },
      ]);
    } finally {
      await client.close();
    }
  }, 180_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 60_000);

  it('testConnection() succeeds against a real MongoDB server', async () => {
    const driver = driverFactory({ config: { connectionUrl } });
    await expect(driver.testConnection()).resolves.toBeUndefined();
  });

  it('testConnection() rejects against an unreachable port', async () => {
    const driver = driverFactory({
      config: { connectionUrl: 'mongodb://127.0.0.1:1/unreachable' },
    });
    // The driver's own timeout is DEFAULT_CONNECTION_TEST_TIMEOUT_MS (30s),
    // so allow ~45s for the rejection to propagate end-to-end.
    await expect(driver.testConnection()).rejects.toBeTruthy();
  }, 45_000);

  it('metadata() lists seeded collections as tables with inferred columns', async () => {
    const driver = driverFactory({ config: { connectionUrl } });
    const metadata = await driver.metadata();

    expect(metadata.driver).toBe('mongodb.default');
    expect(metadata.schemas).toEqual([
      { id: 1, name: DB_NAME, owner: 'unknown' },
    ]);

    const tableNames = metadata.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(['orders', 'users']);

    const usersTable = metadata.tables.find((t) => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable?.schema).toBe(DB_NAME);
    expect(usersTable?.live_rows_estimate).toBe(3);

    const usersColumns = metadata.columns.filter((c) => c.table === 'users');
    const userColumnNames = usersColumns.map((c) => c.name).sort();
    expect(userColumnNames).toEqual(['_id', 'age', 'isActive', 'name']);

    // _id should be flagged as identity + unique
    const idCol = usersColumns.find((c) => c.name === '_id');
    expect(idCol?.is_identity).toBe(true);
    expect(idCol?.is_unique).toBe(true);

    // Non-id fields should carry inferred types from the sample document
    const nameCol = usersColumns.find((c) => c.name === 'name');
    expect(nameCol?.data_type).toBe('string');
    const ageCol = usersColumns.find((c) => c.name === 'age');
    expect(ageCol?.data_type).toBe('number');
    const activeCol = usersColumns.find((c) => c.name === 'isActive');
    expect(activeCol?.data_type).toBe('boolean');

    const ordersColumns = metadata.columns.filter((c) => c.table === 'orders');
    const itemsCol = ordersColumns.find((c) => c.name === 'items');
    expect(itemsCol?.data_type).toBe('array');
  });

  it('query() runs a find command and returns the seeded documents', async () => {
    const driver = driverFactory({ config: { connectionUrl } });
    const result = await driver.query(
      JSON.stringify({ find: 'users', filter: { isActive: true }, limit: 10 }),
    );

    expect(result.rows.length).toBe(2);
    const names = result.rows.map((r) => r.name as string).sort();
    expect(names).toEqual(['Alice', 'Carol']);

    // Columns should be inferred from the first row
    const columnNames = result.columns.map((c) => c.name).sort();
    expect(columnNames).toEqual(['_id', 'age', 'isActive', 'name']);

    expect(result.stat.rowsRead).toBe(2);
    expect(result.stat.queryDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('query() throws a helpful error when the input is not JSON', async () => {
    const driver = driverFactory({ config: { connectionUrl } });
    await expect(driver.query('SELECT * FROM users')).rejects.toThrow(
      /JSON command/i,
    );
  });
});
