import { z } from 'zod';

import {
  UserTokenScopeSchema,
  UserTokenSchema,
  type UserToken,
} from '../../entities';

const ONE_DAY_SECONDS = 86_400;
const ONE_YEAR_SECONDS = 365 * ONE_DAY_SECONDS;

/**
 * `CreateUserTokenInputSchema` — enforces the expiration window at the type
 * layer so validation happens uniformly regardless of caller (server route,
 * test, future CLI pairing flow, etc.).
 *
 * Cap: `expires_at` must be in the future AND within 365 days. The refinement
 * boundary is inclusive on the upper bound (`now + 365d` is accepted) and
 * exclusive on the lower bound (`now` itself is rejected — expires_at must
 * be strictly greater than now).
 */
export const CreateUserTokenInputSchema = z
  .object({
    token_name: z.string().min(1).max(255),
    scopes: z.array(UserTokenScopeSchema).min(1),
    expires_at: z.number().int().positive(),
  })
  .refine(
    ({ expires_at }) => {
      const now = Math.floor(Date.now() / 1000);
      return expires_at > now && expires_at - now <= ONE_YEAR_SECONDS;
    },
    {
      message: 'expires_at must be in the future and within 365 days from now.',
      path: ['expires_at'],
    },
  );

export type CreateUserTokenInput = z.infer<typeof CreateUserTokenInputSchema>;

/**
 * `CreateUserTokenOutputSchema` — what `CreateUserTokenService.execute()`
 * returns. The `rawJwt` is the only place raw token material ever leaves the
 * server — see RFC 0009 spec §6.3.
 */
export const CreateUserTokenOutputSchema = z.object({
  row: UserTokenSchema,
  rawJwt: z.string().min(1),
});

export type CreateUserTokenOutput = z.infer<typeof CreateUserTokenOutputSchema>;

/**
 * `RevokeUserTokenOutputSchema` — alias of `UserTokenSchema`. The revoke
 * service returns the updated row so the caller can show the new `revoked` +
 * `revoked_at` values without a second round-trip.
 */
export const RevokeUserTokenOutputSchema = UserTokenSchema;
export type RevokeUserTokenOutput = UserToken;
