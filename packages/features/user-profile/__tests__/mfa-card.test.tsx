import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'mfa.title': 'Multi-Factor Authentication',
        'mfa.description':
          'Set up Multi-Factor Authentication method to further secure your account.',
        'mfa.emptyCalloutTitle':
          'Secure your account with Multi-Factor Authentication',
        'mfa.emptyCalloutDescription':
          'Set up Multi-Factor Authentication method to further secure your account.',
        'mfa.setupButton': 'Setup a new Factor',
        'mfa.factorsHeading': 'Active factors',
        'mfa.remove': 'Remove',
        'mfa.unenrollConfirm': 'Confirm your password to remove this factor.',
        'mfa.dialog.cancel': 'Cancel',
        'password.current': 'Current password',
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { MfaCard } from '../src/components/mfa-card';

describe('MfaCard', () => {
  it('shows the empty-state callout when there are no factors', () => {
    render(<MfaCard factors={[]} onSetup={() => {}} />);

    expect(
      screen.getByText(/secure your account with multi-factor/i),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Setup a new Factor' }),
    ).toBeEnabled();
  });

  it('disables the Setup button while loading', () => {
    render(<MfaCard factors={[]} isLoading onSetup={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'Setup a new Factor' }),
    ).toBeDisabled();
  });

  it('renders the factor list when factors exist', () => {
    render(
      <MfaCard
        factors={[
          { id: 'a', friendlyName: 'iPhone Authenticator' },
          { id: 'b', friendlyName: 'Backup laptop' },
        ]}
        onSetup={() => {}}
      />,
    );

    expect(screen.getByText('iPhone Authenticator')).toBeVisible();
    expect(screen.getByText('Backup laptop')).toBeVisible();
  });

  it('opens the unenroll confirmation when Remove is clicked', async () => {
    const onUnenroll = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MfaCard
        factors={[{ id: 'a', friendlyName: 'iPhone' }]}
        onSetup={() => {}}
        onUnenroll={onUnenroll}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText(/confirm your password/i)).toBeVisible();
    expect(screen.getByLabelText('Current password')).toBeVisible();
  });
});
