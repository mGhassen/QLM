import { z } from 'zod';

/**
 * A registered MFA factor on `auth.mfa_factors`. Phase 1 supports TOTP
 * only — `factorType` is constrained accordingly.
 */
export const MfaFactorSchema = z.object({
  id: z.string().uuid(),
  friendlyName: z.string().min(1),
  factorType: z.literal('totp'),
  status: z.enum(['unverified', 'verified']),
  createdAt: z.string().datetime(),
});

export type MfaFactor = z.infer<typeof MfaFactorSchema>;

/**
 * Output of `auth.mfa.enroll({ factorType: 'totp' })`. The QR code is a
 * data URI (SVG-encoded by Supabase) ready for `<img src=...>`. The
 * `secret` is the same TOTP secret encoded inside the QR — surface it to
 * the user as a manual-entry fallback. Neither value should be logged.
 */
export const EnrollTotpOutputSchema = z.object({
  id: z.string().uuid(),
  totp: z.object({
    qrCode: z.string().min(1),
    secret: z.string().min(1),
    uri: z.string().min(1),
  }),
});

export type EnrollTotpOutput = z.infer<typeof EnrollTotpOutputSchema>;
