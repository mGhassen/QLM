import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import { ScopePill } from '../src/components/primitives/scope-pill';
import { storybookI18n } from '../src/components/story-helpers';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={storybookI18n}>{ui}</I18nextProvider>);
}

describe('ScopePill', () => {
  it('renders the read label and the blue colour class', () => {
    const { container } = renderWithI18n(<ScopePill scope="read" />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-blue-700/);
    expect(el.className).toMatch(/bg-blue-500\/10/);
  });

  it('renders the write label and the amber colour class', () => {
    const { container } = renderWithI18n(<ScopePill scope="write" />);
    expect(screen.getByText('Write')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-amber-700/);
    expect(el.className).toMatch(/bg-amber-500\/10/);
  });

  it('renders the admin label and the purple colour class', () => {
    const { container } = renderWithI18n(<ScopePill scope="admin" />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/text-purple-700/);
    expect(el.className).toMatch(/bg-purple-500\/10/);
  });
});
