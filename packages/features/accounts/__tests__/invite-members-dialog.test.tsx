import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InviteMembersDialogContainer } from '../src/components/members/invite-members-dialog-container';

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useFetcher: () => ({
      state: 'idle',
      data: undefined,
      submit: vi.fn(),
    }),
    useRevalidator: () => ({ revalidate: vi.fn() }),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { allowed: true, reasons: [] },
    isLoading: false,
    error: null,
  })),
}));

describe('InviteMembersDialogContainer', () => {
  it('renders trigger child', () => {
    render(
      <InviteMembersDialogContainer
        organizationSlug="acme"
        userRoleHierarchy={1}
      >
        <button type="button">Invite members</button>
      </InviteMembersDialogContainer>,
    );
    expect(
      screen.getByRole('button', { name: /invite members/i }),
    ).toBeInTheDocument();
  });
});
