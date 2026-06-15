import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Database, KeyRound, Settings as SettingsIcon } from 'lucide-react';

import { Button } from '@qlm/ui/button';

import { SettingsDialog } from './settings-dialog';
import {
  useMarkSectionDirty,
  useSettingsDirtyState,
} from './dirty-state-context';
import { withSettingsShellProviders } from './story-helpers';
import type { SettingsSection } from '../types/settings-section';

const meta: Meta<typeof SettingsDialog> = {
  title: 'SettingsShell/SettingsDialog',
  component: SettingsDialog,
  decorators: [withSettingsShellProviders],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SettingsDialog>;

function CleanPanePlaceholder({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground text-sm">
      <p className="font-medium">{label} pane</p>
      <p>This pane has no dirty state — closing the dialog is immediate.</p>
    </div>
  );
}

/**
 * Pane that registers itself as dirty when mounted, to exercise the
 * discard-guard branch in the `DiscardGuardDirty` story.
 */
function DirtyPanePlaceholder({
  label,
  sectionKey,
}: {
  label: string;
  sectionKey: string;
}) {
  const markDirty = useMarkSectionDirty(sectionKey);
  useEffect(() => {
    markDirty(true);
    return () => markDirty(false);
  }, [markDirty]);
  return (
    <div className="text-muted-foreground text-sm">
      <p className="font-medium">{label} pane (dirty)</p>
      <p>
        Closing this dialog will fire{' '}
        <code>confirm(&quot;Discard unsaved changes?&quot;)</code>.
      </p>
    </div>
  );
}

function DirtyToggle({ sectionKey }: { sectionKey: string }) {
  const { isAnyDirty } = useSettingsDirtyState();
  return (
    <p className="text-muted-foreground mt-3 text-xs">
      isAnyDirty: <strong>{String(isAnyDirty())}</strong> (sectionKey ={' '}
      <code>{sectionKey}</code>)
    </p>
  );
}

function ControlledDialog({
  sections,
  defaultSectionKey,
}: {
  sections: SettingsSection[];
  defaultSectionKey?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-muted/30 flex min-h-[100vh] items-start justify-center p-8">
      <div>
        <Button onClick={() => setOpen(true)}>Open settings</Button>
        <SettingsDialog
          open={open}
          onOpenChange={setOpen}
          sections={sections}
          defaultSectionKey={defaultSectionKey}
        />
      </div>
    </div>
  );
}

const oneSection: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    icon: <KeyRound className="h-3.5 w-3.5" />,
    content: <CleanPanePlaceholder label="Personal tokens" />,
  },
];

const threeSections: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    icon: <KeyRound className="h-3.5 w-3.5" />,
    content: <CleanPanePlaceholder label="Personal tokens" />,
  },
  {
    key: 'datasources',
    label: 'Datasources',
    icon: <Database className="h-3.5 w-3.5" />,
    content: <CleanPanePlaceholder label="Datasources" />,
  },
  {
    key: 'preferences',
    label: 'Preferences',
    icon: <SettingsIcon className="h-3.5 w-3.5" />,
    content: <CleanPanePlaceholder label="Preferences" />,
  },
];

const dirtySection: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    icon: <KeyRound className="h-3.5 w-3.5" />,
    content: (
      <div>
        <DirtyPanePlaceholder
          label="Personal tokens"
          sectionKey="personal-tokens"
        />
        <DirtyToggle sectionKey="personal-tokens" />
      </div>
    ),
  },
];

export const OneSection: Story = {
  render: () => <ControlledDialog sections={oneSection} />,
};

export const ThreeSections: Story = {
  render: () => <ControlledDialog sections={threeSections} />,
};

export const DiscardGuardClean: Story = {
  name: 'Discard Guard / Clean — close is immediate',
  render: () => <ControlledDialog sections={oneSection} />,
};

export const DiscardGuardDirty: Story = {
  name: 'Discard Guard / Dirty — close shows confirm()',
  render: () => <ControlledDialog sections={dirtySection} />,
};
