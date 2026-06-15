import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsSidebar } from '../src/components/settings-sidebar';
import type { SettingsSection } from '../src/types/settings-section';

const sections: SettingsSection[] = [
  { key: 'personal-tokens', label: 'Personal tokens', content: null },
  { key: 'datasources', label: 'Datasources', content: null },
];

describe('SettingsSidebar', () => {
  it('renders one entry per section', () => {
    render(
      <SettingsSidebar
        sections={sections}
        activeKey="personal-tokens"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Personal tokens')).toBeInTheDocument();
    expect(screen.getByText('Datasources')).toBeInTheDocument();
  });

  it('marks the active entry with aria-current="page"', () => {
    render(
      <SettingsSidebar
        sections={sections}
        activeKey="datasources"
        onSelect={vi.fn()}
      />,
    );
    const activeButton = screen.getByRole('button', { name: 'Datasources' });
    expect(activeButton).toHaveAttribute('aria-current', 'page');
    const inactiveButton = screen.getByRole('button', {
      name: 'Personal tokens',
    });
    expect(inactiveButton).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect with the new key when an inactive entry is clicked', () => {
    const onSelect = vi.fn();
    render(
      <SettingsSidebar
        sections={sections}
        activeKey="personal-tokens"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Datasources' }));
    expect(onSelect).toHaveBeenCalledWith('datasources');
  });

  it('renders nothing meaningful when sections is empty', () => {
    render(<SettingsSidebar sections={[]} activeKey="" onSelect={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
