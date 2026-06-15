import type { QueryClient } from '@tanstack/react-query';

import type {
  EnrollTotpOutput,
  MfaFactor,
} from '@qlm/domain/entities';
import type { IMfaRepository } from '@qlm/domain/repositories';
import {
  EnrollTotpService,
  UnenrollFactorService,
  VerifyMfaFactorService,
} from '@qlm/domain/services';

/**
 * Shell-runtime resource for the signed-in user's MFA factors.
 *
 * Exposes `verify({factorId, code})` as a single call — the resource
 * issues a `challenge` then calls the verify service. The session refresh
 * after a successful verify is the caller's responsibility (typically
 * `client.auth.refreshSession()` from the section consumer) so
 * `shell-runtime` stays free of direct Supabase client coupling.
 */
export function createMfaResource(
  repository: IMfaRepository,
  queryClient: QueryClient,
  currentUserId: string,
) {
  const keys = {
    factors: ['mfa-factors', currentUserId] as const,
  };

  const invalidate = {
    factors: () => queryClient.invalidateQueries({ queryKey: keys.factors }),
  };

  function listFactors(): Promise<MfaFactor[]> {
    return repository.listFactors();
  }

  async function enrollTotp(friendlyName: string): Promise<EnrollTotpOutput> {
    return new EnrollTotpService(repository).execute({ friendlyName });
  }

  /** Issue challenge then verify. Caller refreshes the session on success. */
  async function verify(input: {
    factorId: string;
    code: string;
  }): Promise<void> {
    const { challengeId } = await repository.challenge(input.factorId);
    await new VerifyMfaFactorService(repository).execute({
      factorId: input.factorId,
      challengeId,
      code: input.code,
    });
    await invalidate.factors();
  }

  async function unenroll(factorId: string): Promise<void> {
    await new UnenrollFactorService(repository).execute({ factorId });
    await invalidate.factors();
  }

  return {
    keys,
    listFactors,
    enrollTotp,
    verify,
    unenroll,
    invalidate,
  };
}

export type MfaResource = ReturnType<typeof createMfaResource>;
