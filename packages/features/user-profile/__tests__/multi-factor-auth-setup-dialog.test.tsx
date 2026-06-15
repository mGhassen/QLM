import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'mfa.setupButton': 'Setup a new Factor',
        'mfa.description':
          'Set up Multi-Factor Authentication method to further secure your account.',
        'mfa.dialog.nameTitle': 'Name your factor',
        'mfa.dialog.nameLabel': 'Factor name',
        'mfa.dialog.nameHint': 'A label.',
        'mfa.dialog.qrTitle': 'Scan the QR code',
        'mfa.dialog.qrHint': 'Scan with your authenticator.',
        'mfa.dialog.manualSecret': 'Manual entry secret',
        'mfa.dialog.otpTitle': 'Enter the 6-digit code',
        'mfa.dialog.otpDescription': 'Open your authenticator app.',
        'mfa.dialog.verifying': 'Verifying…',
        'mfa.dialog.enable': 'Enable Factor',
        'mfa.dialog.cancel': 'Cancel',
        'mfa.dialog.next': 'Next',
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { MultiFactorAuthSetupDialog } from '../src/components/multi-factor-auth-setup-dialog';

const enrollmentPayload = {
  factorId: '11111111-1111-4111-8111-111111111111',
  qrCode: 'data:image/svg+xml;utf8,<svg/>',
  secret: 'JBSWY3DPEHPK3PXP',
};

describe('MultiFactorAuthSetupDialog', () => {
  it('progresses through name -> qr -> otp on a happy enrollment', async () => {
    const onEnroll = vi.fn().mockResolvedValue(enrollmentPayload);
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MultiFactorAuthSetupDialog
        open
        onEnroll={onEnroll}
        onVerify={onVerify}
        onCancel={() => {}}
      />,
    );

    await user.type(
      screen.getByLabelText('Factor name'),
      'iPhone Authenticator',
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(onEnroll).toHaveBeenCalledWith('iPhone Authenticator');
    });
    expect(await screen.findByText('Scan the QR code')).toBeVisible();
    expect(screen.getByDisplayValue('JBSWY3DPEHPK3PXP')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Enter the 6-digit code')).toBeVisible();
  });

  it('surfaces verifyError on the OTP step', async () => {
    const onEnroll = vi.fn().mockResolvedValue(enrollmentPayload);
    const user = userEvent.setup();

    const { rerender } = render(
      <MultiFactorAuthSetupDialog
        open
        onEnroll={onEnroll}
        onVerify={vi.fn()}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Factor name'), 'iPhone');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Scan the QR code');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Enter the 6-digit code');

    rerender(
      <MultiFactorAuthSetupDialog
        open
        verifyError="That code didn't work. Please try again."
        onEnroll={onEnroll}
        onVerify={vi.fn()}
        onCancel={() => {}}
      />,
    );

    expect(
      await screen.findByText("That code didn't work. Please try again."),
    ).toBeVisible();
  });

  it('calls onCancel with the pending factorId when closed mid-enrollment', async () => {
    const onCancel = vi.fn();
    const onEnroll = vi.fn().mockResolvedValue(enrollmentPayload);
    const user = userEvent.setup();

    render(
      <MultiFactorAuthSetupDialog
        open
        onEnroll={onEnroll}
        onVerify={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.type(screen.getByLabelText('Factor name'), 'iPhone');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Scan the QR code');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledWith(enrollmentPayload.factorId);
  });
});
