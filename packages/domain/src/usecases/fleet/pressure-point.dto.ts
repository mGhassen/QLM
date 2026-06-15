/**
 * A single "where do I look first" affordance produced by
 * `FleetAggregateService.pressurePoints`. Surfaces nodes that are over
 * the high-utilization threshold OR are operationally unreachable /
 * failing per the RFC 0026 five-axis vocabulary.
 *
 * Phase 1 hardcodes thresholds; phase 6 may move them to config.
 */
export const HIGH_CPU_PCT = 85;
export const HIGH_MEM_PCT = 85;

/** Five pressure kinds (RFC 0026 §5.6). */
export type PressurePointKind =
  | 'unreachable'
  | 'failing'
  | 'criticalHealth'
  | 'highCpu'
  | 'highMem';

export type PressurePoint = {
  kind: PressurePointKind;
  nodeId: string;
  nodeName: string;
  /**
   * For `highCpu` / `highMem`: the observed utilization percent (0-100).
   * For `unreachable` / `failing` / `criticalHealth`: 1 (presence marker).
   */
  value: number;
};
