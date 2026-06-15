import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'password.title': 'Update your Password',
        'password.description':
          'Update your password to keep your account secure.',
        'password.current': 'Current password',
        'password.next': 'New password',
        'password.confirm': 'Confirm new password',
        'password.submit': 'Update Password',
        'password.tooShort': 'New password must be at least 8 characters.',
        'password.sameAsCurrent':
          'New password must differ from the current password.',
        'password.mismatch': 'New password and confirmation do not match.',
        'password.required': 'Please fill in all password fields.',
        'password.invalidCurrent': 'Current password is incorrect.',
        'password.noIdentityLinked':
          'You cannot update your password because your account is not linked to any.',
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { PasswordCard } from '../src/components/password-card';

describe('PasswordCard', () => {
  it('renders the warning banner for OAuth-only users and no form', () => {
    render(<PasswordCard isLinked={false} onSubmit={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/not linked to any/i);
    expect(
      screen.queryByRole('button', { name: 'Update Password' }),
    ).toBeNull();
  });

  it('submits valid input and resets the form', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<PasswordCard isLinked onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Current password'), 'old-secret-1');
    await user.type(screen.getByLabelText('New password'), 'new-secret-12');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'new-secret-12',
    );
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        current: 'old-secret-1',
        next: 'new-secret-12',
      });
    });
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
  });

  it('rejects too-short new password without calling onSubmit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PasswordCard isLinked onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Current password'), 'old-secret-1');
    await user.type(screen.getByLabelText('New password'), 'short1');
    await user.type(screen.getByLabelText('Confirm new password'), 'short1');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects when next equals current', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PasswordCard isLinked onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Current password'), 'identical-12');
    await user.type(screen.getByLabelText('New password'), 'identical-12');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'identical-12',
    );
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(
      await screen.findByText(/differ from the current password/i),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects when confirm does not match', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PasswordCard isLinked onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Current password'), 'old-secret-1');
    await user.type(screen.getByLabelText('New password'), 'new-secret-12');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'mismatch-12',
    );
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText(/do not match/i)).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('surfaces the currentPasswordError prop on the current field', async () => {
    const { rerender } = render(<PasswordCard isLinked onSubmit={vi.fn()} />);

    rerender(
      <PasswordCard
        isLinked
        onSubmit={vi.fn()}
        currentPasswordError="Current password is incorrect."
      />,
    );

    expect(
      await screen.findByText('Current password is incorrect.'),
    ).toBeVisible();
  });

  it('disables fields and submit while submitting', () => {
    render(<PasswordCard isLinked isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Current password')).toBeDisabled();
    expect(screen.getByLabelText('New password')).toBeDisabled();
    expect(screen.getByLabelText('Confirm new password')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Update Password' }),
    ).toBeDisabled();
  });
});
