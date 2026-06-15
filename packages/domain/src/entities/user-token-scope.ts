import { z } from 'zod';

/**
 * Method-based access scope for a user token. Matches the v1 vocabulary and
 * the scope-enforcement contract in `qlm-public-api`.
 *
 * - `read`  → permits HTTP GET only.
 * - `write` → permits HTTP POST / PUT / DELETE.
 * - `admin` → permits any method.
 */
export const UserTokenScopeSchema = z
  .enum(['read', 'write', 'admin'])
  .describe('Method-based access scope for a user token.');

export type UserTokenScope = z.infer<typeof UserTokenScopeSchema>;
