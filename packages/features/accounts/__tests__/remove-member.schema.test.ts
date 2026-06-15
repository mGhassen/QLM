import { describe, it, expect } from 'vitest';

import { RemoveMemberSchema } from '../src/schema/remove-member.schema';

const validPayload = {
  intent: 'remove-member' as const,
  payload: {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    csrfToken: 'token',
  },
};

describe('RemoveMemberSchema', () => {
  it('accepts valid payload', () => {
    const result = RemoveMemberSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects wrong intent', () => {
    const result = RemoveMemberSchema.safeParse({
      ...validPayload,
      intent: 'other',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid organizationId (not UUID)', () => {
    const result = RemoveMemberSchema.safeParse({
      ...validPayload,
      payload: { ...validPayload.payload, organizationId: 'not-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId (not UUID)', () => {
    const result = RemoveMemberSchema.safeParse({
      ...validPayload,
      payload: { ...validPayload.payload, userId: 'not-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing csrfToken', () => {
    const { csrfToken: _, ...payload } = validPayload.payload;
    const result = RemoveMemberSchema.safeParse({
      ...validPayload,
      payload,
    });
    expect(result.success).toBe(false);
  });
});
