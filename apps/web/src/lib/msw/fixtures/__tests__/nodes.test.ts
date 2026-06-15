import { describe, expect, it } from 'vitest';

import { NodeSchema } from '@qlm/domain/entities';

import { generateMetrics24h, seedNodes } from '../nodes';

describe('seedNodes fixture', () => {
  it('generates the requested count', () => {
    const nodes = seedNodes('project-smoke-01', 50);
    expect(nodes).toHaveLength(50);
  });

  it('every node passes NodeSchema validation', () => {
    const nodes = seedNodes('project-smoke-02', 60);
    for (const node of nodes) {
      expect(() => NodeSchema.parse(node)).not.toThrow();
    }
  });

  it('stopped lifecycle nodes have no lastSeenAt; active ones do', () => {
    const nodes = seedNodes('project-smoke-03', 80);
    for (const node of nodes) {
      if (node.lifecycle === 'stopped') {
        expect(node.lastSeenAt).toBeUndefined();
      } else {
        expect(node.lastSeenAt).toBeDefined();
      }
    }
  });

  it('includes version, health, util fields', () => {
    const [first] = seedNodes('project-smoke-04', 1);
    expect(first!.version).toBe(1);
    expect(first!.health).toBeDefined();
    expect(first!.cpuUtilPct).toBeDefined();
    expect(first!.memUtilPct).toBeDefined();
  });
});

describe('generateMetrics24h', () => {
  it('returns 60 deterministic points per node', () => {
    const [node] = seedNodes('project-metrics-01', 1);
    const series = generateMetrics24h(node!);
    expect(series).toHaveLength(60);
    expect(series[0]).toHaveProperty('t');
    expect(series[0]).toHaveProperty('cpu');
    expect(series[0]).toHaveProperty('mem');
  });

  it('values stay within 0–100 bounds', () => {
    const [node] = seedNodes('project-metrics-02', 1);
    const series = generateMetrics24h(node!);
    for (const p of series) {
      expect(p.cpu).toBeGreaterThanOrEqual(0);
      expect(p.cpu).toBeLessThanOrEqual(100);
      expect(p.mem).toBeGreaterThanOrEqual(0);
      expect(p.mem).toBeLessThanOrEqual(100);
    }
  });
});
