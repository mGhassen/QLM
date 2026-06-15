import { describe, expect, it } from 'vitest';

import type { Node } from '@guepard/domain/entities';

import { getNodeDisplayState } from '../src/presentation/lib/get-node-display-state';

type Input = Parameters<typeof getNodeDisplayState>[0];

const baseHappy: Input = {
  lifecycle: 'active',
  orchestration: 'ready',
  eligibility: 'eligible',
  drain: undefined,
  health: 'healthy',
};

describe('getNodeDisplayState — precedence matrix (spec §5.4)', () => {
  it('inactive wins over everything (lifecycle=stopped)', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        lifecycle: 'stopped',
        orchestration: 'down',
        health: 'critical',
        drain: { active: true, ignoreSystemJobs: false, force: false },
        eligibility: 'ineligible',
      }).kind,
    ).toBe('inactive');
  });

  it('inactive — lifecycle=terminating', () => {
    expect(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'terminating' }).kind,
    ).toBe('inactive');
  });

  it('inactive — lifecycle=terminated', () => {
    expect(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'terminated' }).kind,
    ).toBe('inactive');
  });

  it('unreachable beats critical+draining+ineligible', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        orchestration: 'down',
        health: 'critical',
        drain: { active: true, ignoreSystemJobs: false, force: false },
        eligibility: 'ineligible',
      }).kind,
    ).toBe('unreachable');
  });

  it('unreachable — orchestration=disconnected', () => {
    expect(
      getNodeDisplayState({ ...baseHappy, orchestration: 'disconnected' })
        .kind,
    ).toBe('unreachable');
  });

  it('critical beats draining+ineligible+degraded+running', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        health: 'critical',
        drain: { active: true, ignoreSystemJobs: false, force: false },
        eligibility: 'ineligible',
      }).kind,
    ).toBe('critical');
  });

  it('draining beats ineligible+degraded+running', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        drain: { active: true, ignoreSystemJobs: false, force: false },
        eligibility: 'ineligible',
        health: 'degraded',
      }).kind,
    ).toBe('draining');
  });

  it('drain.active=false does NOT count as draining', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        drain: { active: false, ignoreSystemJobs: false, force: false },
      }).kind,
    ).toBe('running');
  });

  it('ineligible beats degraded+running but not draining', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        eligibility: 'ineligible',
        health: 'degraded',
      }).kind,
    ).toBe('ineligible');
  });

  it('degraded beats running', () => {
    expect(
      getNodeDisplayState({ ...baseHappy, health: 'degraded' }).kind,
    ).toBe('degraded');
  });

  it('running — happy path', () => {
    expect(getNodeDisplayState(baseHappy).kind).toBe('running');
  });

  it('pending — provisioning lifecycle', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        lifecycle: 'provisioning',
        orchestration: 'initializing',
        health: 'unknown',
      }).kind,
    ).toBe('pending');
  });

  it('pending — orchestration not ready, no other rule fires', () => {
    expect(
      getNodeDisplayState({
        ...baseHappy,
        orchestration: 'unknown',
        health: 'unknown',
      }).kind,
    ).toBe('pending');
  });

  it('tones are mapped correctly per kind', () => {
    expect(getNodeDisplayState(baseHappy).tone).toBe('success');
    expect(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'stopped' }).tone,
    ).toBe('neutral');
    expect(
      getNodeDisplayState({ ...baseHappy, orchestration: 'down' }).tone,
    ).toBe('destructive');
    expect(
      getNodeDisplayState({ ...baseHappy, health: 'critical' }).tone,
    ).toBe('destructive');
    expect(
      getNodeDisplayState({
        ...baseHappy,
        drain: { active: true, ignoreSystemJobs: false, force: false },
      }).tone,
    ).toBe('warning');
    expect(
      getNodeDisplayState({ ...baseHappy, eligibility: 'ineligible' }).tone,
    ).toBe('neutral');
    expect(
      getNodeDisplayState({ ...baseHappy, health: 'degraded' }).tone,
    ).toBe('warning');
    expect(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'provisioning' }).tone,
    ).toBe('info');
  });

  it('all 8 kinds reachable', () => {
    const kinds = new Set<string>();
    kinds.add(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'stopped' }).kind,
    );
    kinds.add(
      getNodeDisplayState({ ...baseHappy, orchestration: 'down' }).kind,
    );
    kinds.add(getNodeDisplayState({ ...baseHappy, health: 'critical' }).kind);
    kinds.add(
      getNodeDisplayState({
        ...baseHappy,
        drain: { active: true, ignoreSystemJobs: false, force: false },
      }).kind,
    );
    kinds.add(
      getNodeDisplayState({ ...baseHappy, eligibility: 'ineligible' }).kind,
    );
    kinds.add(getNodeDisplayState({ ...baseHappy, health: 'degraded' }).kind);
    kinds.add(getNodeDisplayState(baseHappy).kind);
    kinds.add(
      getNodeDisplayState({ ...baseHappy, lifecycle: 'provisioning' }).kind,
    );
    expect(kinds.size).toBe(8);
  });
});

// Defensive — keeps Node import live if a future change needs it.
void (null as unknown as Node);
