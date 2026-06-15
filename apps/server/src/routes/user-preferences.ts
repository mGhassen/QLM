import { zValidator } from '../lib/zod-validator.js';
import { Hono } from 'hono';
import type { Context } from 'hono';

import { UserPreferencesPayloadSchema } from '@qlm/domain/entities';
import type { Repositories } from '@qlm/domain/repositories';

import { getCurrentUserId } from '../lib/current-account';
import { handleDomainException } from '../lib/http-utils';
import { createRateLimiter, type RateLimiter } from '../lib/rate-limiter';

/**
 * `GET` / `PATCH /api/me/preferences`.
 *
 * - Caller identity comes from the session (shared resolver with the
 *   user-tokens route). The browser never sends a user id.
 * - `GET` returns `{ preferences: {}, updated_at: null, created_at: null, user_id }`
 *   when the user has no row yet — implicit creation on PATCH.
 * - `PATCH` validates the body with `UserPreferencesPayloadSchema.partial().passthrough()`
 *   and calls the atomic merge adapter. Rate-limited to 60 rpm per user to
 *   blunt runaway clients without punishing normal navigation writes.
 */
const PatchBodySchema = UserPreferencesPayloadSchema.partial().passthrough();

export type UserPreferencesRoutesOptions = {
  /** Test seam: override the rate limiter (e.g. disable for deterministic tests). */
  rateLimiter?: RateLimiter;
};

export function createUserPreferencesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
  getCurrentUserIdResolver: (
    c: Context,
  ) => Promise<string | null> = getCurrentUserId,
  options: UserPreferencesRoutesOptions = {},
) {
  const rateLimiter =
    options.rateLimiter ?? createRateLimiter({ windowMs: 60_000, max: 60 });
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const userId = await getCurrentUserIdResolver(c);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const repos = await getRepositories(c);
      const row = await repos.userPreferences.get(userId);
      if (row) return c.json(row);

      return c.json({
        user_id: userId,
        preferences: {},
        created_at: null,
        updated_at: null,
      });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.patch('/', zValidator('json', PatchBodySchema), async (c) => {
    try {
      const userId = await getCurrentUserIdResolver(c);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const decision = rateLimiter.check(`preferences:patch:${userId}`);
      if (!decision.allowed) {
        c.header('Retry-After', String(decision.retryAfterSeconds));
        return c.json(
          {
            error: 'rate_limited',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
          429,
        );
      }

      const repos = await getRepositories(c);
      const patch = c.req.valid('json');
      const row = await repos.userPreferences.patch(userId, patch);
      return c.json(row);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
