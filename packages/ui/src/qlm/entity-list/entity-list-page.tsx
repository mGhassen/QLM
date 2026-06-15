import { type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import {
  EntityListToolbar,
  type EntityListPrimaryAction,
} from './entity-list-toolbar';

export type EntityListPageProps = {
  title: string;
  /** Optional description shown under the title. */
  description?: ReactNode;

  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;

  /** Rendered in the toolbar between search and primary action (e.g. <EntityListOptionsMenu />). */
  options?: ReactNode;
  primaryAction?: EntityListPrimaryAction;
  /** Render a fully custom CTA; takes precedence over `primaryAction`. */
  primarySlot?: ReactNode;

  /** The list content (table, grid, etc.). */
  children: ReactNode;
  className?: string;
  stretchContent?: boolean;
};

/**
 * Generic page layout for "list of X" screens across the app.
 * Renders a title, a toolbar (search + options + primary action), then the
 * list content in a scrollable container.
 *
 * @example
 * ```tsx
 * <EntityListPage
 *   title="Notebooks"
 *   searchPlaceholder="Search notebooks..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   options={<EntityListOptionsMenu ... />}
 *   primaryAction={{ label: 'New Notebook', onClick: handleCreate }}
 * >
 *   <EntityListTable columns={...} items={...} getRowId={...} />
 * </EntityListPage>
 * ```
 */
export function EntityListPage({
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  options,
  primaryAction,
  primarySlot,
  children,
  className,
  stretchContent,
}: Readonly<EntityListPageProps>) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full max-w-7xl flex-col px-6 pt-8 lg:px-12 lg:pt-10',
        stretchContent ? 'gap-3 pb-0' : 'gap-6 pb-8 lg:pb-10',
        className,
      )}
    >
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-4xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-base">{description}</p>
        )}
      </div>

      {/* Toolbar */}
      <EntityListToolbar
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        options={options}
        primaryAction={primaryAction}
        primarySlot={primarySlot}
      />

      {/* Content */}
      <div
        className={cn(
          'min-h-0 flex-1',
          stretchContent ? 'flex flex-col overflow-hidden' : 'overflow-auto',
        )}
      >
        {children}
      </div>
    </div>
  );
}
