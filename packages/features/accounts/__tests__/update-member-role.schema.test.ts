import { describe, it, expect } from 'vitest';

import { UpdateMemberRoleSchema } from '../src/schema/update-member-role.schema';

const validPayload = {
  intent: 'update-member-role' as const,
  payload: {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    role: 'member',
    csrfToken: 'token',
  },
};

describe('UpdateMemberRoleSchema', () => {
  it('accepts valid payload', () => {
    const result = UpdateMemberRoleSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects wrong intent', () => {
    const result = UpdateMemberRoleSchema.safeParse({
      ...validPayload,
      intent: 'other',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty role', () => {
    const result = UpdateMemberRoleSchema.safeParse({
      ...validPayload,
      payload: { ...validPayload.payload, role: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid organizationId (not UUID)', () => {
    const result = UpdateMemberRoleSchema.safeParse({
      ...validPayload,
      payload: { ...validPayload.payload, organizationId: 'not-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId (not UUID)', () => {
    const result = UpdateMemberRoleSchema.safeParse({
      ...validPayload,
      payload: { ...validPayload.payload, userId: 'not-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing csrfToken', () => {
    const { csrfToken: _, ...payload } = validPayload.payload;
    const result = UpdateMemberRoleSchema.safeParse({
      ...validPayload,
      payload,
    });
    expect(result.success).toBe(false);
  });
});
