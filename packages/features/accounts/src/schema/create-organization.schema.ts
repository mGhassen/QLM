import { z } from 'zod';

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

const SPECIAL_CHARACTERS_REGEX = /[!@#$%^&*()+=[\]{};':"\\|,.<>/?]/;

/**
 * @name OrganizationNameSchema
 */
export const OrganizationNameSchema = z
  .string()
  .min(2)
  .max(50)
  .refine((name) => !SPECIAL_CHARACTERS_REGEX.test(name), {
    message: 'organizations:specialCharactersError',
  })
  .refine(
    (name) => {
      return !RESERVED_NAMES_ARRAY.includes(name.toLowerCase());
    },
    {
      message: 'organizations:reservedNameError',
    },
  );

/**
 * @name CreateOrganizationSchema
 * @description Schema for creating an organization
 */
export const CreateOrganizationSchema = z.object({
  name: OrganizationNameSchema,
  csrfToken: z.string().min(1),
});
