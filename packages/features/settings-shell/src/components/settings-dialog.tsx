import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@guepard/ui/utils';

import {
  DirtyStateProvider,
  useSettingsDirtyState,
} from './dirty-state-context';
import { SettingsSidebar } from './settings-sidebar';
import type {
  SettingsSection,
  SettingsSectionKey,
} from '../types/settings-section';

export type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  sections: ReadonlyArray<SettingsSection>;
  defaultSectionKey?: SettingsSectionKey;
  /** i18n key for the dialog title (default `'settings:dialog.title'`). */
  titleKey?: string;
  /** i18n key for the X-button aria-label (default `'settings:dialog.close'`). */
  closeAriaLabelKey?: string;
  /** i18n key for the discard-guard `confirm()` message (default `'settings:dialog.discardGuard'`). */
  discardGuardKey?: string;
};

const DEFAULTS = {
  titleKey: 'settings:dialog.title',
  closeAriaLabelKey: 'settings:dialog.close',
  discardGuardKey: 'settings:dialog.discardGuard',
};

/**
 * Two-pane settings dialog. Composed by `apps/web/src/components/settings-dialog-mount.tsx`.
 *
 * Discard guard: every Radix-driven close path (overlay click, Esc, X) goes
 * through `handleOpenChange`; if any registered section is dirty, we fire
 * a synchronous `confirm(t(discardGuardKey))` and only proceed when the
 * user accepts. AM-1's "no nested dialogs" rule rules out a custom modal
 * for this — browser-native is the right fit.
 */
export function SettingsDialog(props: Readonly<SettingsDialogProps>) {
  return (
    <DirtyStateProvider>
      <SettingsDialogInner {...props} />
    </DirtyStateProvider>
  );
}

function SettingsDialogInner({
  open,
  onOpenChange,
  sections,
  defaultSectionKey,
  titleKey = DEFAULTS.titleKey,
  closeAriaLabelKey = DEFAULTS.closeAriaLabelKey,
  discardGuardKey = DEFAULTS.discardGuardKey,
}: Readonly<SettingsDialogProps>) {
  const { t } = useTranslation('settings');
  const { isAnyDirty } = useSettingsDirtyState();

  const initialKey = defaultSectionKey ?? sections[0]?.key ?? '';
  // Reset the active section whenever the dialog re-opens — a fresh open
  // should always land on `defaultSectionKey`. We key the `useState`
  // initializer on `open` instead of a `useEffect + setState` chain so the
  // reset happens during reconciliation, not in a follow-up render
  // (rule: `react-hooks/set-state-in-effect`).
  const [activeKey, setActiveKey] = useState<SettingsSectionKey>(initialKey);
  const [lastOpenTick, setLastOpenTick] = useState(open);
  if (open !== lastOpenTick) {
    setLastOpenTick(open);
    if (open) setActiveKey(initialKey);
  }

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && isAnyDirty()) {
        const confirmed = window.confirm(t(discardGuardKey));
        if (!confirmed) return;
      }
      onOpenChange(next);
    },
    [isAnyDirty, onOpenChange, t, discardGuardKey],
  );

  const activeSection = sections.find((s) => s.key === activeKey);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'fixed top-[50%] left-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]',
            'rounded-lg border shadow-lg duration-200',
            'h-[80vh] max-h-[640px] grid-cols-[220px_1fr] grid-rows-[auto_1fr]',
          )}
        >
          <header className="col-span-2 flex items-center justify-between border-b px-5 py-3">
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
              {t(titleKey)}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t(closeAriaLabelKey)}
              className="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>

          <aside className="overflow-y-auto border-r p-3">
            <SettingsSidebar
              sections={sections}
              activeKey={activeKey}
              onSelect={setActiveKey}
            />
          </aside>

          <section
            className="overflow-y-auto p-6"
            data-test={`settings-section-${activeKey}`}
          >
            {activeSection?.content ?? null}
          </section>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
