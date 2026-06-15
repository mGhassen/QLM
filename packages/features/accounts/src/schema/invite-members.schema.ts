import { z } from 'zod';

import { CsrfTokenSchema } from '@guepard/csrf/schema';

const EMAIL_MAX_LENGTH = 254;

const InviteSchema = z.object({
  email: z
    .email()
    .trim()
    .min(1, 'Email is required')
    .describe('Enter a valid email address')
    .max(EMAIL_MAX_LENGTH, 'Email is too long'),
  role: z
    .string()
    .trim()
    .min(1, 'Role is required')
    .max(100, 'Role is too long'),
});

const BaseInvitationsSchema = CsrfTokenSchema.extend({
  invitations: InviteSchema.array()
    .min(1, 'Add at least one member')
    .max(5, 'Maximum 5 invites at once'),
  organizationSlug: z.string().min(1).max(255),
}).refine(
  (data) => {
    const emails = data.invitations.map((m) => m.email.toLowerCase().trim());
    return new Set(emails).size === emails.length;
  },
  { message: 'Duplicate emails are not allowed', path: ['invitations'] },
);

export const InvitationsSchema = BaseInvitationsSchema;

export function createInvitationsSchema(allowedRoles: string[]) {
  if (!allowedRoles.length) return BaseInvitationsSchema;
  return BaseInvitationsSchema.superRefine((data, ctx) => {
    data.invitations.forEach((inv, i) => {
      if (inv.role && !allowedRoles.includes(inv.role)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a valid role',
          path: ['invitations', i, 'role'],
        });
      }
    });
  });
}

export const InviteMembersSchema = z.object({
  intent: z.literal('create-invitations'),
  payload: InvitationsSchema,
});
