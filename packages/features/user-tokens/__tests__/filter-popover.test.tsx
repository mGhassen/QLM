import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import type { UserTokenScope, UserTokenStatus } from '@guepard/domain/entities';

import { FilterPopover } from '../src/components/primitives/filter-popover';
import { storybookI18n } from '../src/components/story-helpers';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={storybookI18n}>{ui}</I18nextProvider>);
}

const STATUS_OPTIONS: ReadonlyArray<{
  value: UserTokenStatus;
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
];

const SCOPE_OPTIONS: ReadonlyArray<{
  value: UserTokenScope;
  label: string;
}> = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin' },
];

describe('FilterPopover', () => {
  it('renders no badge count when nothing is selected', () => {
    renderWithI18n(
      <FilterPopover<UserTokenStatus>
        label="Status"
        options={STATUS_OPTIONS}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    // The trigger button has the label and the chevron — no badge text.
    const trigger = screen.getByRole('button', { name: /Status/i });
    expect(trigger.textContent).not.toMatch(/\d/);
  });

  it('shows the badge count matching `selected.length`', () => {
    renderWithI18n(
      <FilterPopover<UserTokenStatus>
        label="Status"
        options={STATUS_OPTIONS}
        selected={['active', 'expired']}
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Status/i });
    expect(trigger.textContent).toContain('2');
  });

  it('emits the new array (in option-declaration order) when a checkbox is toggled', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <FilterPopover<UserTokenStatus>
        label="Status"
        options={STATUS_OPTIONS}
        selected={['expired']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Status/i }));
    fireEvent.click(screen.getByLabelText('Active'));
    // 'active' comes BEFORE 'expired' in the option declaration, so the
    // emitted array is ['active', 'expired'] not ['expired', 'active'].
    expect(onChange).toHaveBeenCalledWith(['active', 'expired']);
  });

  it('removes a previously-selected value when its checkbox is toggled off', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <FilterPopover<UserTokenStatus>
        label="Status"
        options={STATUS_OPTIONS}
        selected={['active', 'expired']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Status/i }));
    fireEvent.click(screen.getByLabelText('Active'));
    expect(onChange).toHaveBeenCalledWith(['expired']);
  });

  it('is generic enough to handle UserTokenScope options', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <FilterPopover<UserTokenScope>
        label="Scopes"
        options={SCOPE_OPTIONS}
        selected={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Scopes/i }));
    fireEvent.click(screen.getByLabelText('Admin'));
    expect(onChange).toHaveBeenCalledWith(['admin']);
  });
});
