import { describe, expect, it } from 'vitest';

import {
  UserPreferencesPayloadSchema,
  UserPreferencesSchema,
} from '../../src/entities/user-preferences.type';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_A = '22222222-2222-4222-8222-222222222222';
const PROJ_A = '44444444-4444-4444-8444-444444444444';

describe('UserPreferencesPayloadSchema', () => {
  it('parses a valid payload with a populated last_project_by_org map', () => {
    const parsed = UserPreferencesPayloadSchema.parse({
      last_project_by_org: { [ORG_A]: PROJ_A },
    });

    expect(parsed.last_project_by_org).toEqual({ [ORG_A]: PROJ_A });
  });

  it('defaults last_project_by_org to {} when absent', () => {
    const parsed = UserPreferencesPayloadSchema.parse({});

    expect(parsed.last_project_by_org).toEqual({});
  });

  it('rejects a non-uuid org key', () => {
    expect(() =>
      UserPreferencesPayloadSchema.parse({
        last_project_by_org: { 'not-a-uuid': PROJ_A },
      }),
    ).toThrow();
  });

  it('rejects a non-uuid project id value', () => {
    expect(() =>
      UserPreferencesPayloadSchema.parse({
        last_project_by_org: { [ORG_A]: 'not-a-uuid' },
      }),
    ).toThrow();
  });

  it('rejects a non-string project id value', () => {
    expect(() =>
      UserPreferencesPayloadSchema.parse({
        last_project_by_org: { [ORG_A]: 42 as unknown as string },
      }),
    ).toThrow();
  });

  it('preserves unknown top-level keys (passthrough)', () => {
    const parsed = UserPreferencesPayloadSchema.parse({
      last_project_by_org: { [ORG_A]: PROJ_A },
      theme: 'dark',
    });

    expect((parsed as unknown as { theme: string }).theme).toBe('dark');
  });
});

describe('UserPreferencesSchema', () => {
  it('parses a valid full row', () => {
    const parsed = UserPreferencesSchema.parse({
      user_id: USER_ID,
      preferences: { last_project_by_org: { [ORG_A]: PROJ_A } },
      created_at: '2026-04-20T00:00:00Z',
      updated_at: '2026-04-20T00:00:00Z',
    });

    expect(parsed.user_id).toBe(USER_ID);
    expect(parsed.preferences.last_project_by_org[ORG_A]).toBe(PROJ_A);
  });

  it('accepts null timestamps', () => {
    const parsed = UserPreferencesSchema.parse({
      user_id: USER_ID,
      preferences: { last_project_by_org: {} },
      created_at: null,
      updated_at: null,
    });

    expect(parsed.created_at).toBeNull();
    expect(parsed.updated_at).toBeNull();
  });

  it('rejects a malformed user_id', () => {
    expect(() =>
      UserPreferencesSchema.parse({
        user_id: 'not-a-uuid',
        preferences: { last_project_by_org: {} },
        created_at: null,
        updated_at: null,
      }),
    ).toThrow();
  });
});
