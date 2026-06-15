import { z } from 'zod';

/**
 * Team member schema
 * Represents a member of an organization/team account
 */
export const TeamMemberSchema = z.object({
  id: z.uuid().describe('The id of the member account'),
  userId: z.uuid().describe('The user id of the member'),
  accountId: z.uuid().describe('The organization account id'),
  role: z.string().describe('The role of the member'),
  roleHierarchyLevel: z
    .number()
    .int()
    .positive()
    .describe('The hierarchy level of the role'),
  primaryOwnerUserId: z.uuid().describe('The primary owner user id'),
  name: z.string().nullable().describe('The name of the member'),
  email: z.string().email().describe('The email of the member'),
  pictureUrl: z.string().nullable().describe('The picture URL of the member'),
  createdAt: z.date().describe('The date and time the membership was created'),
  updatedAt: z
    .date()
    .describe('The date and time the membership was last updated'),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;
