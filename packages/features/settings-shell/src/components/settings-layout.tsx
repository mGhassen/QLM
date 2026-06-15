import { type ReactNode } from 'react';

import { SidebarDetailLayout } from '@guepard/ui/layout';

import { SettingsSidebar, type SettingsSidebarProps } from './settings-sidebar';

export type SettingsLayoutProps = Readonly<{
  /** Sections rendered in the left-rail nav. Same shape `SettingsSidebar` takes. */
  sections: SettingsSidebarProps['sections'];
  /** Key of the currently-active section. */
  activeKey: SettingsSidebarProps['activeKey'];
  /** Fires when the user clicks a nav entry. */
  onSelect: SettingsSidebarProps['onSelect'];
  /** Body content (typically the active section's rendered pane). */
  children: ReactNode;
}>;

/**
 * Thin convenience wrapper around `SidebarDetailLayout` from
 * `@guepard/ui/layout` — feeds a `SettingsSidebar` into the rail slot
 * so every settings app can stay a one-liner at the call site.
 * Non-settings consumers (datasource drill-downs, list/detail splits)
 * should use `<SidebarDetailLayout>` directly.
 */
export function SettingsLayout({
  sections,
  activeKey,
  onSelect,
  children,
}: SettingsLayoutProps) {
  return (
    <SidebarDetailLayout
      sidebar={
        <SettingsSidebar
          sections={sections}
          activeKey={activeKey}
          onSelect={onSelect}
        />
      }
    >
      {children}
    </SidebarDetailLayout>
  );
}
