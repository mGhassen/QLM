import { describe, expect, it } from 'vitest';

import { deriveNodeHealth } from '../../../src/services/node/derive-health';
import { HEALTH_THRESHOLDS } from '../../../src/services/node/health-thresholds';

const NOW = new Date('2026-01-01T12:00:00Z').toISOString();

describe('deriveNodeHealth', () => {
  it('returns unknown when no runtime snapshot is provided', () => {
    expect(
      deriveNodeHealth({ orchestration: 'ready', lastHeartbeatAt: NOW }, null),
    ).toBe('unknown');
  });

  it('returns unknown when no heartbeat has been observed yet', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: undefined },
        { cpuUtilPct: 10, memUtilPct: 10 },
      ),
    ).toBe('unknown');
  });

  it('returns critical when orchestration is down (regardless of utilization)', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'down', lastHeartbeatAt: NOW },
        { cpuUtilPct: 5, memUtilPct: 5 },
      ),
    ).toBe('critical');
  });

  it('returns critical when orchestration is disconnected', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'disconnected', lastHeartbeatAt: NOW },
        { cpuUtilPct: 5, memUtilPct: 5 },
      ),
    ).toBe('critical');
  });

  it('returns critical when CPU is at the critical threshold', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        { cpuUtilPct: HEALTH_THRESHOLDS.CPU_CRITICAL, memUtilPct: 10 },
      ),
    ).toBe('critical');
  });

  it('returns critical when memory is at the critical threshold', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        { cpuUtilPct: 10, memUtilPct: HEALTH_THRESHOLDS.MEM_CRITICAL },
      ),
    ).toBe('critical');
  });

  it('returns degraded just below the critical threshold', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        { cpuUtilPct: HEALTH_THRESHOLDS.CPU_CRITICAL - 1, memUtilPct: 10 },
      ),
    ).toBe('degraded');
  });

  it('returns degraded when CPU is at the high threshold', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        { cpuUtilPct: HEALTH_THRESHOLDS.CPU_HIGH, memUtilPct: 10 },
      ),
    ).toBe('degraded');
  });

  it('returns healthy when both util metrics are below the high threshold', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        {
          cpuUtilPct: HEALTH_THRESHOLDS.CPU_HIGH - 1,
          memUtilPct: HEALTH_THRESHOLDS.MEM_HIGH - 1,
        },
      ),
    ).toBe('healthy');
  });

  it('returns unknown when both metrics are null even with a heartbeat', () => {
    expect(
      deriveNodeHealth(
        { orchestration: 'ready', lastHeartbeatAt: NOW },
        { cpuUtilPct: null, memUtilPct: null },
      ),
    ).toBe('unknown');
  });

  it('treats orchestration "unknown" as a non-fatal state for health derivation', () => {
    // Orchestration unknown = bootstrap; if metrics are healthy we still
    // report healthy. Other axes (lifecycle, eligibility) are not in
    // scope for health.
    expect(
      deriveNodeHealth(
        { orchestration: 'unknown', lastHeartbeatAt: NOW },
        { cpuUtilPct: 10, memUtilPct: 10 },
      ),
    ).toBe('healthy');
  });
});
