import type { EnrollTotpOutput, MfaFactor } from '../entities/mfa-factor.type';

/**
 * Abstract port for the signed-in user's MFA factors.
 *
 * The adapter delegates to Supabase's `auth.mfa.*` API. Re-auth gating for
 * destructive operations (unenroll) lives **outside** this port — the
 * caller is expected to verify the user's current password (e.g. via
 * `IAccountRepository.updatePassword` or a direct `signInWithPassword`
 * call) before invoking `unenroll`. The port itself does not enforce it
 * because the Supabase API does not expose a re-auth-required variant.
 *
 * Phase 1 supports TOTP factors only.
 */
export abstract class IMfaRepository {
  /** All MFA factors registered against the current session. */
  public abstract listFactors(): Promise<MfaFactor[]>;

  /**
   * Begin TOTP enrollment. Returns the new factor id plus the QR code +
   * secret that the user pastes into their authenticator app. The factor
   * is in `unverified` state until `verify()` succeeds.
   */
  public abstract enrollTotp(friendlyName: string): Promise<EnrollTotpOutput>;

  /**
   * Issue a challenge against an enrolled factor. Returns the
   * `challengeId` to pair with the user-supplied OTP at `verify()` time.
   * Each challenge expires server-side (Supabase default 5 minutes).
   */
  public abstract challenge(factorId: string): Promise<{ challengeId: string }>;

  /**
   * Verify a challenge. On success, Supabase issues a new session with
   * AAL2 — the caller should refresh the auth session afterwards so the
   * client picks up the new claims.
   */
  public abstract verify(input: {
    factorId: string;
    challengeId: string;
    code: string;
  }): Promise<void>;

  /** Remove a factor. Idempotent on Supabase's side. */
  public abstract unenroll(factorId: string): Promise<void>;
}
