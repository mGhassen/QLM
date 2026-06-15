import { createContext, useContext, type ReactNode } from 'react';

import type { UserToken } from '@qlm/domain/entities';
import type {
  CreateUserTokenInput,
  CreateUserTokenOutput,
} from '@qlm/domain/usecases';

/**
 * Browser-side surface for the three user-token operations the feature
 * needs. Intentionally narrower than `IUserTokenRepository` because the
 * feature does NOT need `findById` / `findBySlug` / `findAll` / `update` /
 * `delete` (those methods just throw "not supported" on the adapter), and
 * BECAUSE the create flow returns `{ row, rawJwt }` — a shape the domain
 * port can't express (the port's `create` returns just `UserToken`).
 *
 * The host app (`apps/web`) wraps the feature components with
 * `<UserTokensApiProvider value={...}>`, passing an object whose methods
 * delegate to `HttpUserTokenRepository`. Tests pass a mock with the same
 * shape — no shell-runtime dependency.
 */
export type UserTokensApi = {
  list(): Promise<UserToken[]>;
  create(input: CreateUserTokenInput): Promise<CreateUserTokenOutput>;
  revoke(id: string): Promise<UserToken>;
};

const UserTokensApiContext = createContext<UserTokensApi | null>(null);

export function UserTokensApiProvider({
  value,
  children,
}: Readonly<{ value: UserTokensApi; children: ReactNode }>) {
  return (
    <UserTokensApiContext.Provider value={value}>
      {children}
    </UserTokensApiContext.Provider>
  );
}

export function useUserTokensApi(): UserTokensApi {
  const ctx = useContext(UserTokensApiContext);
  if (!ctx) {
    throw new Error(
      'useUserTokensApi must be used within a <UserTokensApiProvider>',
    );
  }
  return ctx;
}
