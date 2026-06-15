import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'name.title': 'Your Name',
        'name.description': 'Update your name to be displayed on your profile.',
        'name.label': 'Your Name',
        'name.submit': 'Update Profile',
        'name.required': 'Please enter a name.',
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { NameCard } from '../src/components/name-card';

describe('NameCard', () => {
  it('renders the current name in the input', () => {
    render(<NameCard name="Hani Chalouati" onSubmit={() => {}} />);

    expect(screen.getByLabelText('Your Name')).toHaveValue('Hani Chalouati');
  });

  it('submits the new trimmed name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<NameCard name="Hani" onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Your Name');
    await user.clear(input);
    await user.type(input, '  New Name  ');
    await user.click(screen.getByRole('button', { name: 'Update Profile' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('New Name');
    });
  });

  it('shows the inline required error on empty submit and does not call onSubmit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<NameCard name="Hani" onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText('Your Name'));
    await user.click(screen.getByRole('button', { name: 'Update Profile' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a name.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the input and button while submitting', () => {
    render(<NameCard name="Hani" isSubmitting onSubmit={() => {}} />);

    expect(screen.getByLabelText('Your Name')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Update Profile' }),
    ).toBeDisabled();
  });
});
