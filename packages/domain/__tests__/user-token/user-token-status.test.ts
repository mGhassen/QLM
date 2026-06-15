import { describe, expect, it } from 'vitest';

import { deriveUserTokenStatus } from '../../src/entities/user-token-status';

describe('deriveUserTokenStatus', () => {
  // Fixed "now" reference so every boundary test is deterministic.
  const NOW = 1_747_000_000; // arbitrary Unix-seconds value
  const FUTURE = NOW + 3600; // 1 hour from now
  const PAST = NOW - 3600; // 1 hour ago

  it('returns "revoked" when the token is revoked, regardless of expiry', () => {
    expect(
      deriveUserTokenStatus({
        revoked: true,
        expires_at: FUTURE,
        nowUnix: NOW,
      }),
    ).toBe('revoked');

    expect(
      deriveUserTokenStatus({
        revoked: true,
        expires_at: PAST,
        nowUnix: NOW,
      }),
    ).toBe('revoked');
  });

  it('returns "expired" when not revoked and expires_at < now', () => {
    expect(
      deriveUserTokenStatus({
        revoked: false,
        expires_at: PAST,
        nowUnix: NOW,
      }),
    ).toBe('expired');
  });

  it('returns "expired" at the inclusive boundary where expires_at === now', () => {
    expect(
      deriveUserTokenStatus({
        revoked: false,
        expires_at: NOW,
        nowUnix: NOW,
      }),
    ).toBe('expired');
  });

  it('returns "active" when not revoked and expires_at > now', () => {
    expect(
      deriveUserTokenStatus({
        revoked: false,
        expires_at: FUTURE,
        nowUnix: NOW,
      }),
    ).toBe('active');
  });

  it('returns "active" at the boundary where expires_at === now + 1', () => {
    expect(
      deriveUserTokenStatus({
        revoked: false,
        expires_at: NOW + 1,
        nowUnix: NOW,
      }),
    ).toBe('active');
  });

  it('defaults nowUnix to Math.floor(Date.now() / 1000) when omitted', () => {
    const currentNow = Math.floor(Date.now() / 1000);
    expect(
      deriveUserTokenStatus({
        revoked: false,
        expires_at: currentNow + 60,
      }),
    ).toBe('active');
  });
});
