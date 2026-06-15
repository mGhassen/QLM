import type { Node } from '@guepard/domain/entities';

/**
 * UI-only abstraction over the five-axis state. NEVER persisted, NEVER
 * read by domain logic, NEVER aggregated by SQL. Spec §5.4 / RFC §5.4a.
 *
 * Precedence (high → low):
 *   inactive > unreachable > critical > draining > ineligible > degraded
 *   > running > pending
 *
 * `kind` drives copy + tone. Story 002 acceptance: precedence matrix is
 * exhaustively tested. Adding a new kind requires a new precedence row.
 */
export type NodeDisplayKind =
  | 'inactive'
  | 'unreachable'
  | 'critical'
  | 'draining'
  | 'ineligible'
  | 'degraded'
  | 'running'
  | 'pending';

export type NodeDisplayTone =
  | 'neutral'    // muted — inactive, ineligible
  | 'destructive' // emerald off → red — critical, unreachable
  | 'warning'    // amber — degraded, draining
  | 'success'    // emerald — running
  | 'info';      // blue — pending

export type NodeDisplayState = {
  kind: NodeDisplayKind;
  tone: NodeDisplayTone;
};

const TONE_BY_KIND: Record<NodeDisplayKind, NodeDisplayTone> = {
  inactive: 'neutral',
  unreachable: 'destructive',
  critical: 'destructive',
  draining: 'warning',
  ineligible: 'neutral',
  degraded: 'warning',
  running: 'success',
  pending: 'info',
};

export function getNodeDisplayState(
  node: Pick<
    Node,
    'lifecycle' | 'orchestration' | 'eligibility' | 'drain' | 'health'
  >,
): NodeDisplayState {
  const { lifecycle, orchestration, eligibility, drain, health } = node;

  // 1. inactive — operator turned the box off (or it's gone).
  if (
    lifecycle === 'stopped' ||
    lifecycle === 'terminating' ||
    lifecycle === 'terminated'
  ) {
    return { kind: 'inactive', tone: TONE_BY_KIND.inactive };
  }

  // 2. unreachable — orchestrator can't talk to it.
  if (orchestration === 'down' || orchestration === 'disconnected') {
    return { kind: 'unreachable', tone: TONE_BY_KIND.unreachable };
  }

  // 3. critical — runtime telemetry says something is on fire.
  if (health === 'critical') {
    return { kind: 'critical', tone: TONE_BY_KIND.critical };
  }

  // 4. draining — operator started a planned shutdown; show countdown.
  if (drain?.active === true) {
    return { kind: 'draining', tone: TONE_BY_KIND.draining };
  }

  // 5. ineligible — cordoned off from the scheduler without a drain.
  if (eligibility === 'ineligible') {
    return { kind: 'ineligible', tone: TONE_BY_KIND.ineligible };
  }

  // 6. degraded — runtime telemetry is yellow.
  if (health === 'degraded') {
    return { kind: 'degraded', tone: TONE_BY_KIND.degraded };
  }

  // 7. running — happy path.
  if (lifecycle === 'active' && orchestration === 'ready') {
    return { kind: 'running', tone: TONE_BY_KIND.running };
  }

  // 8. pending — anything still coming up.
  return { kind: 'pending', tone: TONE_BY_KIND.pending };
}
