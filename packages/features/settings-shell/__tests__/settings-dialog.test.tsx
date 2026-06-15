import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import { storybookI18n } from '../src/components/story-helpers';
import { SettingsDialog } from '../src/components/settings-dialog';
import {
  useMarkSectionDirty,
  useSettingsDirtyState,
} from '../src/components/dirty-state-context';
import type { SettingsSection } from '../src/types/settings-section';

function renderDialog(props: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  sections: SettingsSection[];
}) {
  return render(
    <I18nextProvider i18n={storybookI18n}>
      <SettingsDialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        sections={props.sections}
      />
    </I18nextProvider>,
  );
}

const cleanSections: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    content: <div>Personal tokens content</div>,
  },
  {
    key: 'datasources',
    label: 'Datasources',
    content: <div>Datasources content</div>,
  },
];

function DirtyMarker({ sectionKey }: { sectionKey: string }) {
  const markDirty = useMarkSectionDirty(sectionKey);
  const { isAnyDirty } = useSettingsDirtyState();
  return (
    <div>
      <button onClick={() => markDirty(true)}>mark dirty</button>
      <button onClick={() => markDirty(false)}>mark clean</button>
      <span data-testid="dirty">{String(isAnyDirty())}</span>
    </div>
  );
}

const dirtySections: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    content: <DirtyMarker sectionKey="personal-tokens" />,
  },
];

describe('SettingsDialog', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('renders the i18n title and the X close button when open', () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      sections: cleanSections,
    });
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close settings' }),
    ).toBeInTheDocument();
  });

  it('renders the active section content (defaults to first section)', () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      sections: cleanSections,
    });
    expect(screen.getByText('Personal tokens content')).toBeInTheDocument();
    expect(screen.queryByText('Datasources content')).not.toBeInTheDocument();
  });

  it('switches sections when a sidebar entry is clicked', () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      sections: cleanSections,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Datasources' }));
    expect(screen.getByText('Datasources content')).toBeInTheDocument();
    expect(
      screen.queryByText('Personal tokens content'),
    ).not.toBeInTheDocument();
  });

  it('closes immediately (no confirm) when nothing is dirty', () => {
    const onOpenChange = vi.fn();
    renderDialog({
      open: true,
      onOpenChange,
      sections: cleanSections,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows confirm() and proceeds when the user accepts', () => {
    const onOpenChange = vi.fn();
    renderDialog({
      open: true,
      onOpenChange,
      sections: dirtySections,
    });
    fireEvent.click(screen.getByText('mark dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows confirm() and aborts close when the user rejects', () => {
    confirmSpy.mockReturnValue(false);
    const onOpenChange = vi.fn();
    renderDialog({
      open: true,
      onOpenChange,
      sections: dirtySections,
    });
    fireEvent.click(screen.getByText('mark dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
