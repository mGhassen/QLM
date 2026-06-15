import { z } from 'zod';

export const DeleteAccountFormSchema = z.object({
  otp: z.string().min(6),
});

export const DeletePersonalAccountSchema = z.object({
  payload: DeleteAccountFormSchema,
  intent: z.literal('delete-account'),
});
