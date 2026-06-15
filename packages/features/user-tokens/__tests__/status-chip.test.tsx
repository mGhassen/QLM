import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import { StatusChip } from '../src/components/primitives/status-chip';
import { storybookI18n } from '../src/components/story-helpers';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={storybookI18n}>{ui}</I18nextProvider>);
}

describe('StatusChip', () => {
  it('renders the active label and the green colour class', () => {
    const { container } = renderWithI18n(<StatusChip status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-green-700/);
    expect(el.className).toMatch(/bg-green-500\/10/);
  });

  it('renders the expired label and the muted colour class', () => {
    const { container } = renderWithI18n(<StatusChip status="expired" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-muted-foreground/);
    expect(el.className).toMatch(/bg-muted/);
  });

  it('renders the revoked label and the red colour class', () => {
    const { container } = renderWithI18n(<StatusChip status="revoked" />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-red-700/);
    expect(el.className).toMatch(/bg-red-500\/10/);
  });
});
