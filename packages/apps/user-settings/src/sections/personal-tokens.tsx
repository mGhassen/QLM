import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  CreateUserTokenInput,
  CreateUserTokenOutput,
} from '@guepard/domain/usecases';
import { useShellApp } from '@guepard/shell-runtime';
import {
  UserTokensApiProvider,
  type UserTokensApi,
} from '@guepard/user-tokens/hooks';
import { TokensSettingsPane } from '@guepard/user-tokens/components';

/**
 * Wraps `TokensSettingsPane` with the `UserTokensApi` adapter that
 * bridges the domain `IUserTokenRepository` port to the JWT-issuing
 * `createAndIssueJwt` method exposed by the host's
 * `HttpUserTokenRepository`. The cast is the documented escape hatch
 * (see story 0009/008) — the domain port returns `UserToken`, but the
 * UI needs the `{ row, rawJwt }` shape to display the one-time JWT.
 */
export function PersonalTokensSection() {
  const { t } = useTranslation('settings');
  const { repositories } = useShellApp();

  const userTokensApi = useMemo<UserTokensApi>(() => {
    const repo = repositories.userToken;
    return {
      list: () => repo.findByAccountId(''),
      create: async (input: CreateUserTokenInput) => {
        const httpRepo = repo as unknown as {
          createAndIssueJwt: (
            payload: { account_id: string } & CreateUserTokenInput,
          ) => Promise<CreateUserTokenOutput>;
        };
        return httpRepo.createAndIssueJwt({ account_id: '', ...input });
      },
      revoke: async (id) => {
        const row = await repo.revoke(id, '');
        if (!row) {
          throw new Error(`Token ${id} not found.`);
        }
        return row;
      },
    };
  }, [repositories.userToken]);

  return (
    <UserTokensApiProvider value={userTokensApi}>
      <div className="p-6">
        <header className="space-y-1 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('nav.personalTokens')}
          </h2>
        </header>
        <TokensSettingsPane />
      </div>
    </UserTokensApiProvider>
  );
}
