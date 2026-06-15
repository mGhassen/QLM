import { describe, expect, it } from 'vitest';

import { NodeEntity, NodeSchema } from '../../src/entities/node.type';

describe('NodeSchema', () => {
  const valid = {
    id: 'n_1',
    projectId: 'p_1',
    name: 'web-1',
    kind: 'standard-4' as const,
    region: 'us-east-1' as const,
    cpuCores: 4,
    memoryGb: 16,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('parses a minimal valid node and fills defaults', () => {
    const parsed = NodeSchema.parse(valid);
    expect(parsed.tags).toEqual([]);
    expect(parsed.version).toBe(1);
  });

  it('rejects empty name', () => {
    expect(() => NodeSchema.parse({ ...valid, name: '' })).toThrow();
  });

  it('rejects negative cpuCores', () => {
    expect(() => NodeSchema.parse({ ...valid, cpuCores: -1 })).toThrow();
  });

  it('rejects unknown lifecycle', () => {
    expect(() =>
      NodeSchema.parse({ ...valid, lifecycle: 'bogus' as never }),
    ).toThrow();
  });

  it('rejects memUtilPct out of range', () => {
    expect(() => NodeSchema.parse({ ...valid, memUtilPct: 120 })).toThrow();
  });
});

describe('NodeEntity', () => {
  it('create() produces a valid entity with initial version + provisioning lifecycle', () => {
    const entity = NodeEntity.create({
      projectId: 'p_1',
      name: 'worker-1',
      kind: 'highmem-4',
      region: 'eu-west-1',
      cpuCores: 4,
      memoryGb: 32,
    });
    expect(entity.version).toBe(1);
    expect(entity.lifecycle).toBe('provisioning');
    expect(entity.orchestration).toBe('unknown');
    expect(entity.eligibility).toBe('eligible');
    expect(entity.tags).toEqual([]);
    expect(entity.id).toBeDefined();
  });

  it('update() bumps version and updates fields', () => {
    const entity = NodeEntity.create({
      projectId: 'p_1',
      name: 'worker-1',
      kind: 'standard-4',
      region: 'us-west-2',
      cpuCores: 4,
      memoryGb: 16,
    });
    const updated = NodeEntity.update(entity, {
      id: entity.id,
      name: 'worker-renamed',
      tags: ['prod'],
    });
    expect(updated.version).toBe(2);
    expect(updated.name).toBe('worker-renamed');
    expect(updated.tags).toEqual(['prod']);
  });
});
