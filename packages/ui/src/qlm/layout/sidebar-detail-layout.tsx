import { type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export type SidebarDetailLayoutProps = Readonly<{
  /** Left-rail content (typically a nav list). */
  sidebar: ReactNode;
  /** Body content rendered to the right of the rail. */
  children: ReactNode;
  /**
   * Fixed rail width. Tailwind spacing scale; defaults to `'w-56'`
   * (224px). Pass another `w-*` class to override.
   */
  sidebarWidth?: string;
  /** Optional className on the outer flex container. */
  className?: string;
}>;

/**
 * Generic two-column layout: a fixed-width left rail plus a
 * scrolling content region. No domain coupling — the rail is an
 * opaque `ReactNode`, so any nav/list/tree/tabs primitive can sit
 * there.
 *
 * Used today by the settings shell (`SettingsLayout` composes
 * `<SettingsSidebar>` into this), and meant to be the default
 * sidebar-detail shape for any future "list on the left, drill-down
 * on the right" surface.
 *
 * No vertical divider between the rail and the content — the rail's
 * own hover/active styling already does the separation, and a static
 * divider stacks awkwardly when this layout nests inside a shell
 * that has its own panel chrome.
 */
export function SidebarDetailLayout({
  sidebar,
  children,
  sidebarWidth = 'w-56',
  className,
}: SidebarDetailLayoutProps) {
  return (
    <div className={cn('flex h-full', className)}>
      <aside className={cn('shrink-0 p-3', sidebarWidth)}>{sidebar}</aside>
      <section className="min-w-0 flex-1 overflow-auto">{children}</section>
    </div>
  );
}
