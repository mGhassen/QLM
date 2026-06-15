import { z } from 'zod';

import { CsrfTokenSchema } from '@qlm/csrf/schema';

/**
 * @name RESERVED_NAMES_ARRAY
 * @description Array of reserved names for organizations
 * This is a list of names that cannot be used for organizations as they are reserved for other purposes.
 * Please include any new reserved names here.
 */
const RESERVED_NAMES_ARRAY = [
  'settings',
  'billing',
  // please add more reserved names here
];

/**
 * @name OrganizationNameSchema
 */
const OrganizationNameSchema = z
  .string()
  .min(2)
  .max(50)
  .refine(
    (name) => {
      return !RESERVED_NAMES_ARRAY.includes(name.toLowerCase());
    },
    {
      message: 'organizations:reservedNameError',
    },
  );

export const OrganizationNameFormSchema = CsrfTokenSchema.extend({
  name: OrganizationNameSchema,
});

export const UpdateOrganizationNameSchema = z.object({
  intent: z.literal('update-organization-name'),
  payload: CsrfTokenSchema.extend({
    slug: z.string().min(1).max(255),
    path: z.string().min(1).max(255),
    name: z.string().min(1).max(255),
  }),
});
