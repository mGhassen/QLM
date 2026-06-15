import { z } from 'zod';

export const EnrollTotpInputSchema = z.object({
  friendlyName: z.string().trim().min(1).max(64),
});
export type EnrollTotpInput = z.infer<typeof EnrollTotpInputSchema>;

export const VerifyMfaFactorInputSchema = z.object({
  factorId: z.string().uuid(),
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, {
    message: 'Verification code must be exactly 6 digits.',
  }),
});
export type VerifyMfaFactorInput = z.infer<typeof VerifyMfaFactorInputSchema>;

export const UnenrollMfaFactorInputSchema = z.object({
  factorId: z.string().uuid(),
});
export type UnenrollMfaFactorInput = z.infer<
  typeof UnenrollMfaFactorInputSchema
>;
