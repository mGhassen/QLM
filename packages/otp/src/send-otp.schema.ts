import { z } from 'zod';

export const SendOtpEmailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  // Purpose of the OTP (e.g., 'email-verification', 'password-reset')
  purpose: z.string().min(1).max(1000),
  // how long the OTP should be valid for. Defaults to 1 hour. Max is 7 days. Min is 30 seconds.
  expiresInSeconds: z
    .number()
    .min(30)
    .max(86400 * 7)
    .default(3600)
    .optional(),
});
