import { describe, expect, it } from 'vitest';

import { UserTokenScopeSchema } from '../../src/entities/user-token-scope';

describe('UserTokenScopeSchema', () => {
  it.each(['read', 'write', 'admin'])('accepts the "%s" scope', (scope) => {
    expect(UserTokenScopeSchema.parse(scope)).toBe(scope);
  });

  it('rejects an unknown scope value', () => {
    expect(() => UserTokenScopeSchema.parse('superuser')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => UserTokenScopeSchema.parse('')).toThrow();
  });

  it('rejects a non-string value', () => {
    expect(() => UserTokenScopeSchema.parse(42)).toThrow();
    expect(() => UserTokenScopeSchema.parse(null)).toThrow();
    expect(() => UserTokenScopeSchema.parse(undefined)).toThrow();
  });
});
