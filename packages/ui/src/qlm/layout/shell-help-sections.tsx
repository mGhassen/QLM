import {
  Keyboard,
  Layers,
  LayoutGrid,
  Rocket,
  type LucideIcon,
} from 'lucide-react';

import { Kbd, KbdGroup } from '../../shadcn/kbd';
import { Shortcuts, type ShortcutItem } from '../shortcuts';
import type { HelpSection } from './help-dialog';

/**
 * Creates the default set of help sections for the project shell.
 * Content is plain JSX — consumers can extend or override as needed.
 */
export function createShellHelpSections(): HelpSection[] {
  return [
    {
      id: 'getting-started',
      label: 'Getting started',
      icon: Rocket as LucideIcon,
      content: (
        <div className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">
            Welcome to QLM
          </h2>
          <p className="text-muted-foreground text-sm">
            QLM is your database workspace — use apps to query, analyze, and
            manage your data. Apps open as tabs at the top of the workspace.
          </p>
          <p className="text-muted-foreground text-sm">
            Pick an app from the sidebar to get started, or press{' '}
            <KbdInline>⌘</KbdInline> <KbdInline>T</KbdInline> to open a new tab.
          </p>
          <p className="text-muted-foreground text-sm">
            Need more help? Check out the{' '}
            <span className="text-foreground font-medium">
              Keyboard shortcuts
            </span>
            , <span className="text-foreground font-medium">Tab actions</span>,
            and <span className="text-foreground font-medium">App actions</span>{' '}
            sections.
          </p>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      icon: Keyboard as LucideIcon,
      content: (
        <div className="space-y-5">
          <h2 className="text-foreground text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <p className="text-muted-foreground text-sm">
            Use these shortcuts to navigate the workspace faster. On Windows and
            Linux, replace <KbdInline>⌘</KbdInline> with{' '}
            <KbdInline>Ctrl</KbdInline>.
          </p>
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-black tracking-[0.3em] uppercase">
              General
            </p>
            <Shortcuts items={KEYBOARD_SHORTCUTS} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-black tracking-[0.3em] uppercase">
              Tab system
            </p>
            <Shortcuts items={TAB_SHORTCUTS} />
          </div>
        </div>
      ),
    },
    {
      id: 'tab-actions',
      label: 'Tab actions',
      icon: Layers as LucideIcon,
      content: (
        <div className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">Tab actions</h2>
          <p className="text-muted-foreground text-sm">
            The tab bar supports mouse and keyboard gestures similar to browser
            tabs and VS Code.
          </p>
          <ActionList items={TAB_ACTIONS} />
        </div>
      ),
    },
    {
      id: 'app-actions',
      label: 'App actions',
      icon: LayoutGrid as LucideIcon,
      content: (
        <div className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">App actions</h2>
          <p className="text-muted-foreground text-sm">
            Interact with apps from the left sidebar.
          </p>
          <ActionList items={APP_ACTIONS} />
        </div>
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Content data
// ---------------------------------------------------------------------------

const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  { text: 'New tab', keys: ['⌘', 'T'] },
  { text: 'Close current tab', keys: ['⌘', 'W'] },
  { text: 'Toggle sidebar', keys: ['⌘', 'B'] },
  { text: 'Open documentation', keys: ['⌘', '/'] },
];

const TAB_SHORTCUTS: ShortcutItem[] = [
  { text: 'Reopen last closed tab', keys: ['Ctrl', 'Shift', 'T'] },
  { text: 'Navigate back in history', keys: ['Alt', '←'] },
  { text: 'Navigate forward in history', keys: ['Alt', '→'] },
  { text: 'Cycle recent tabs (MRU)', keys: ['Ctrl', '`'] },
  { text: 'Search open tabs', keys: ['Ctrl', 'Shift', 'K'] },
  { text: 'Move tab focus left', keys: ['←'] },
  { text: 'Move tab focus right', keys: ['→'] },
  { text: 'Activate focused tab', keys: ['Enter'] },
  { text: 'Toggle tab selection', keys: ['Ctrl', 'click'] },
  { text: 'Range select tabs', keys: ['Shift', 'click'] },
];

type Action = {
  gesture: string;
  description: string;
};

const TAB_ACTIONS: Action[] = [
  { gesture: 'Left click', description: 'Switch to the tab' },
  { gesture: 'Double click', description: 'Pin / unpin the tab' },
  { gesture: 'Middle click', description: 'Close the tab' },
  {
    gesture: 'Right click',
    description: 'Open context menu (Pin, Move, Close, Group)',
  },
  { gesture: 'Drag', description: 'Reorder tabs in the bar' },
  { gesture: 'Drag onto group pill', description: 'Add tab to that group' },
  {
    gesture: 'Wheel scroll on tab bar',
    description: 'Switch to prev / next tab',
  },
];

const APP_ACTIONS: Action[] = [
  { gesture: 'Click', description: 'Open the app in the current tab' },
  {
    gesture: 'Cmd / Ctrl + click',
    description: 'Open the app in a new browser tab',
  },
  {
    gesture: 'Hover + click the "+" button',
    description: 'Show the app actions menu (pin, open in new tab, etc.)',
  },
  {
    gesture: 'Click on "Apps" in the sidebar',
    description: 'Collapse or expand the full apps list',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function KbdInline({ children }: { children: React.ReactNode }) {
  return (
    <KbdGroup className="inline-flex align-middle">
      <Kbd>{children}</Kbd>
    </KbdGroup>
  );
}

function ActionList({ items }: { items: Action[] }) {
  return (
    <div className="bg-popover text-popover-foreground divide-border divide-y rounded-lg border">
      {items.map((action) => (
        <div
          key={action.gesture}
          className="flex items-center justify-between gap-4 px-4 py-2.5"
        >
          <span className="text-foreground text-sm font-medium">
            {action.gesture}
          </span>
          <span className="text-muted-foreground text-right text-sm">
            {action.description}
          </span>
        </div>
      ))}
    </div>
  );
}
