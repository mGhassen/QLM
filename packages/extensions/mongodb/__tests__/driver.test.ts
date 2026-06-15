import { describe, expect, it } from 'vitest';

import { driverFactory } from '../src/driver';

describe('mongodb driver', () => {
  it('exposes the IDataSourceDriver surface', () => {
    const driver = driverFactory({
      config: { connectionUrl: 'mongodb://localhost:27017/test' },
    });

    expect(typeof driver.testConnection).toBe('function');
    expect(typeof driver.metadata).toBe('function');
    expect(typeof driver.query).toBe('function');
    expect(typeof driver.close).toBe('function');
  });

  it('rejects invalid connection URLs at factory time', () => {
    expect(() =>
      driverFactory({
        config: { connectionUrl: 'not-a-mongo-uri' },
      }),
    ).toThrow();
  });
});
