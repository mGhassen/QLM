import {
  CircleStop,
  Copy,
  Download,
  Droplets,
  ExternalLink,
  Eye,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';

import type { Node, NodeLifecycleState } from '@qlm/domain/entities';
import type { Action } from '@qlm/ui/action';
import type { BulkAction } from '@qlm/ui/data-table-advanced';

// Structural `t` shape — i18next's `TFunction` is invariant in its `Ns`
// generic, so a `t` from `useTranslation('nodes')` cannot be assigned to a
// builder typed against the default namespace. We only call `t(key)` /
// `t(key, options)` here, so a callable shape is sufficient.
type TFn = {
  (key: string): string;
  (key: string, options: Record<string, unknown>): string;
};

/**
 * Row-level actions shown in card / table three-dot menus. Deps stay tight —
 * a card or table cell never cares about bulk or footer concerns.
 */
export type RowActionsDeps = Readonly<{
  t: TFn;
  onViewDetails: (n: Node) => void;
  onDelete: (id: string) => void | Promise<void>;
  onSetLifecycle: (id: string, lifecycle: NodeLifecycleState) => void | Promise<void>;
  /** Opens the drain dialog for the given node — caller owns deadline / force / ignoreSystemJobs input. */
  onDrain: (n: Node) => void;
  onCancelDrain: (id: string) => void | Promise<void>;
  /** Optional — when provided, adds an "Open in tab" entry that routes to the per-node deep page in a virtual tab. */
  onOpenInTab?: (n: Node) => void;
}>;

export function buildRowActions(deps: RowActionsDeps): Action<Node>[] {
  const { t } = deps;
  const openInTab: Action<Node>[] = deps.onOpenInTab
    ? [
      {
        id: 'openInTab',
        label: t('actions.openInTab'),
        icon: ExternalLink,
        run: (ctx) => deps.onOpenInTab!(ctx as Node),
      },
    ]
    : [];
  return [
    {
      id: 'view',
      label: t('actions.view'),
      icon: Eye,
      run: (ctx) => deps.onViewDetails(ctx as Node),
    },
    ...openInTab,
    {
      id: 'start',
      label: t('actions.start'),
      icon: Play,
      isVisible: (ctx) => {
        const n = ctx as Node;
        return n.lifecycle !== 'active' && !n.drain?.active;
      },
      run: (ctx) => deps.onSetLifecycle((ctx as Node).id, 'active'),
    },
    {
      id: 'drain',
      label: t('actions.drain'),
      icon: Droplets,
      isVisible: (ctx) => {
        const n = ctx as Node;
        return n.lifecycle === 'active' && !n.drain?.active;
      },
      run: (ctx) => deps.onDrain(ctx as Node),
    },
    {
      id: 'cancelDrain',
      label: t('actions.cancelDrain'),
      icon: Droplets,
      isVisible: (ctx) => Boolean((ctx as Node).drain?.active),
      run: (ctx) => deps.onCancelDrain((ctx as Node).id),
    },
    {
      id: 'stop',
      label: t('actions.stop'),
      icon: CircleStop,
      isVisible: (ctx) => (ctx as Node).lifecycle !== 'stopped',
      run: (ctx) => deps.onSetLifecycle((ctx as Node).id, 'stopped'),
    },
    {
      id: 'delete',
      label: t('actions.delete'),
      icon: Trash2,
      intent: 'destructive',
      confirm: {
        title: t('details.deleteConfirmTitle'),
        description: (ctx) =>
          t('details.deleteConfirmDescription', {
            name: (ctx as Node).name,
          }),
        confirmLabel: t('details.deleteConfirm'),
        cancelLabel: t('actions.cancel'),
      },
      run: (ctx) => deps.onDelete((ctx as Node).id),
    },
  ];
}

/**
 * Bulk actions shown in the selection toolbar. Array-based callbacks —
 * the page owns orchestration (flash, toast, clear-selection) and the
 * builder just declares the surface.
 */
export type BulkActionsDeps = Readonly<{
  t: TFn;
  onCopyIds: (nodes: Node[]) => void | Promise<void>;
  onCopyJson: (nodes: Node[]) => void | Promise<void>;
  onExportCsv: (nodes: Node[]) => void | Promise<void>;
  onBulkStart: (nodes: Node[]) => void | Promise<void>;
  onBulkStop: (nodes: Node[]) => void | Promise<void>;
  onBulkDrain: (nodes: Node[]) => void | Promise<void>;
  onBulkDelete: (nodes: Node[]) => void | Promise<void>;
}>;

export function buildBulkActions(deps: BulkActionsDeps): BulkAction<Node>[] {
  const { t } = deps;
  return [
    {
      id: 'copy-ids',
      label: t('copyIds'),
      icon: Copy,
      overflow: true,
      run: (rows) => deps.onCopyIds(rows),
    },
    {
      id: 'copy-json',
      label: t('copyJson'),
      icon: Copy,
      overflow: true,
      run: (rows) => deps.onCopyJson(rows),
    },
    {
      id: 'export-csv',
      label: t('exportCsv'),
      icon: Download,
      overflow: true,
      run: (rows) => deps.onExportCsv(rows),
    },
    {
      id: 'start',
      label: t('actions.start'),
      icon: Play,
      isDisabled: (rows) =>
        rows.every((n) => n.lifecycle === 'active' || n.drain?.active),
      run: (rows) => deps.onBulkStart(rows),
    },
    {
      id: 'drain',
      label: t('actions.drain'),
      icon: Droplets,
      isDisabled: (rows) =>
        !rows.some((n) => n.lifecycle === 'active' && !n.drain?.active),
      run: (rows) => deps.onBulkDrain(rows),
    },
    {
      id: 'stop',
      label: t('actions.stop'),
      icon: CircleStop,
      isDisabled: (rows) => rows.every((n) => n.lifecycle === 'stopped'),
      run: (rows) => deps.onBulkStop(rows),
    },
    {
      id: 'delete',
      label: t('actions.delete'),
      icon: Trash2,
      destructive: true,
      confirm: {
        title: t('bulk.deleteConfirmTitle'),
        description: (rows) =>
          t('bulk.deleteConfirmDescription', {
            count: rows.length,
          }),
        confirmLabel: t('bulk.deleteConfirm'),
        cancelLabel: t('actions.cancel'),
      },
      run: (rows) => deps.onBulkDelete(rows),
    },
  ];
}

/**
 * Sheet footer actions for the details read-mode view. Edit-mode submit /
 * cancel stays native (form="node-edit-form") — `ActionFooter` intentionally
 * doesn't drive HTML form submission.
 */
export type FooterActionsDeps = Readonly<{
  t: TFn;
  onEdit: (n: Node) => void;
  onDelete: (n: Node) => void | Promise<void>;
}>;

export function buildFooterActions(
  deps: FooterActionsDeps,
): Action<Node>[] {
  const { t } = deps;
  return [
    {
      id: 'delete',
      label: t('actions.delete'),
      icon: Trash2,
      intent: 'destructive',
      confirm: {
        title: t('details.deleteConfirmTitle'),
        description: (ctx) =>
          t('details.deleteConfirmDescription', {
            name: (ctx as Node).name,
          }),
        confirmLabel: t('details.deleteConfirm'),
        cancelLabel: t('actions.cancel'),
        requireTyped: {
          value: (ctx) => (ctx as Node).name,
          prompt: t('details.deleteNamePrompt'),
        },
      },
      run: (ctx) => deps.onDelete(ctx as Node),
    },
    {
      id: 'edit',
      label: t('edit.button'),
      icon: Pencil,
      run: (ctx) => deps.onEdit(ctx as Node),
    },
  ];
}

/**
 * Convenience hook that bundles all three action slices. Use when a
 * component needs multiple slices (e.g. the list page, which renders
 * both row menus and the bulk bar). For single-slice consumers (card,
 * sheet footer), keep using the build* functions directly — they
 * have tighter deps and no unused passthroughs.
 */
export type UseNodesActionsDeps = Readonly<
  RowActionsDeps & BulkActionsDeps & FooterActionsDeps
>;

export function useActions(deps: UseNodesActionsDeps): {
  row: Action<Node>[];
  bulk: Array<BulkAction<Node> | Action<Node>>;
  footer: Action<Node>[];
} {
  return {
    row: buildRowActions(deps),
    bulk: buildBulkActions(deps),
    footer: buildFooterActions(deps),
  };
}
