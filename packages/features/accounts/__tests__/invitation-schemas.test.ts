import { describe, it, expect } from 'vitest';

import { DeleteInvitationSchema } from '../src/schema/delete-invitation.schema';
import { UpdateInvitationSchema } from '../src/schema/update-invitation.schema';

describe('DeleteInvitationSchema', () => {
  it('accepts valid payload', () => {
    const result = DeleteInvitationSchema.safeParse({
      intent: 'delete-invitation',
      payload: { invitationId: 1, csrfToken: 'token' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong intent', () => {
    const result = DeleteInvitationSchema.safeParse({
      intent: 'other',
      payload: { invitationId: 1, csrfToken: 'token' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer invitationId', () => {
    const result = DeleteInvitationSchema.safeParse({
      intent: 'delete-invitation',
      payload: { invitationId: 1.5, csrfToken: 'token' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing csrfToken', () => {
    const result = DeleteInvitationSchema.safeParse({
      intent: 'delete-invitation',
      payload: { invitationId: 1 },
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateInvitationSchema', () => {
  it('accepts valid payload', () => {
    const result = UpdateInvitationSchema.safeParse({
      intent: 'update-invitation',
      payload: { invitationId: 1, role: 'member', csrfToken: 'token' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong intent', () => {
    const result = UpdateInvitationSchema.safeParse({
      intent: 'other',
      payload: { invitationId: 1, role: 'member', csrfToken: 'token' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty role', () => {
    const result = UpdateInvitationSchema.safeParse({
      intent: 'update-invitation',
      payload: { invitationId: 1, role: '', csrfToken: 'token' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing csrfToken', () => {
    const result = UpdateInvitationSchema.safeParse({
      intent: 'update-invitation',
      payload: { invitationId: 1, role: 'member' },
    });
    expect(result.success).toBe(false);
  });
});
