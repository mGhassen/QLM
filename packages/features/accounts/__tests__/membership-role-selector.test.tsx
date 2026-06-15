import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MembershipRoleSelector } from '../src/components/members/membership-role-selector';

function getTrigger() {
  return screen.getByRole('combobox');
}

describe('MembershipRoleSelector', () => {
  it('renders trigger with placeholder when value is empty', () => {
    const onChange = vi.fn();
    render(
      <MembershipRoleSelector
        roles={['owner', 'member']}
        value=""
        onChange={onChange}
        placeholder="Choose role"
      />,
    );
    expect(getTrigger()).toBeInTheDocument();
    expect(screen.getByText('Choose role')).toBeInTheDocument();
  });

  it('renders trigger when value is set', () => {
    const onChange = vi.fn();
    render(
      <MembershipRoleSelector
        roles={['owner', 'member']}
        value="member"
        onChange={onChange}
        placeholder="Role"
      />,
    );
    expect(getTrigger()).toBeInTheDocument();
  });

  it('renders with no roles', () => {
    const onChange = vi.fn();
    render(
      <MembershipRoleSelector
        roles={[]}
        value=""
        onChange={onChange}
        placeholder="Role"
      />,
    );
    expect(getTrigger()).toBeInTheDocument();
  });
});
