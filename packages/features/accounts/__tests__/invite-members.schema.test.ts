import { describe, it, expect } from 'vitest';

import {
  InvitationsSchema,
  InviteMembersSchema,
  createInvitationsSchema,
} from '../src/schema/invite-members.schema';

const validPayload = {
  csrfToken: 'token',
  organizationSlug: 'acme',
  invitations: [
    { email: 'a@example.com', role: 'member' },
    { email: 'b@example.com', role: 'owner' },
  ],
};

describe('InvitationsSchema', () => {
  it('accepts valid payload with one invitation', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [{ email: 'user@example.com', role: 'member' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid payload with up to 5 invitations', () => {
    const invitations = Array.from({ length: 5 }, (_, i) => ({
      email: `user${i}@example.com`,
      role: 'member',
    }));
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty invitations', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 invitations', () => {
    const invitations = Array.from({ length: 6 }, (_, i) => ({
      email: `user${i}@example.com`,
      role: 'member',
    }));
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate emails', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [
        { email: 'same@example.com', role: 'member' },
        { email: 'same@example.com', role: 'owner' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [{ email: 'not-an-email', role: 'member' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [{ email: '', role: 'member' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty role', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      invitations: [{ email: 'a@example.com', role: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing csrfToken', () => {
    const { csrfToken: _, ...rest } = validPayload;
    const result = InvitationsSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty organizationSlug', () => {
    const result = InvitationsSchema.safeParse({
      ...validPayload,
      organizationSlug: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('createInvitationsSchema', () => {
  it('accepts roles that are in allowed list', () => {
    const schema = createInvitationsSchema(['owner', 'member']);
    const result = schema.safeParse({
      ...validPayload,
      invitations: [{ email: 'a@example.com', role: 'member' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects role not in allowed list', () => {
    const schema = createInvitationsSchema(['owner', 'member']);
    const result = schema.safeParse({
      ...validPayload,
      invitations: [{ email: 'a@example.com', role: 'admin' }],
    });
    expect(result.success).toBe(false);
  });

  it('when allowedRoles is empty, does not validate role against list', () => {
    const schema = createInvitationsSchema([]);
    const result = schema.safeParse({
      ...validPayload,
      invitations: [{ email: 'a@example.com', role: 'any-role' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('InviteMembersSchema', () => {
  it('accepts valid create-invitations intent', () => {
    const result = InviteMembersSchema.safeParse({
      intent: 'create-invitations',
      payload: validPayload,
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong intent', () => {
    const result = InviteMembersSchema.safeParse({
      intent: 'other',
      payload: validPayload,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing intent', () => {
    const result = InviteMembersSchema.safeParse({ payload: validPayload });
    expect(result.success).toBe(false);
  });

  it('rejects invalid payload', () => {
    const result = InviteMembersSchema.safeParse({
      intent: 'create-invitations',
      payload: { ...validPayload, invitations: [] },
    });
    expect(result.success).toBe(false);
  });
});
