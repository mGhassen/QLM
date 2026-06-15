import { Copy, Download, ExternalLink, Eye, Trash2 } from 'lucide-react';

import type { DatabaseOutput } from '@qlm/domain/usecases';
import type { Action } from '@qlm/ui/action';
import type { BulkAction } from '@qlm/ui/data-table-advanced';

// Cast helpers — Action<T> is contravariant in T; cast to Action<unknown>
// so the return value can be assigned to AdvancedColumn / RowActionMenu which
// both declare Action<unknown>[].
function asActions<T>(actions: Action<T>[]): Action<unknown>[] {
  return actions as unknown as Action<unknown>[];
}
function asBulkActions<T>(actions: BulkAction<T>[]): BulkAction<unknown>[] {
  return actions as unknown as BulkAction<unknown>[];
}

// Structural `t` shape — i18next's `TFunction` is invariant in its `Ns`
// generic, so a `t` from `useTranslation('databases')` cannot be assigned
// to a builder typed against the default namespace.
type TFn = {
  (key: string): string;
  (key: string, options: Record<string, unknown>): string;
};

export type RowActionsDeps = Readonly<{
  t: TFn;
  onViewDetails: (db: DatabaseOutput) => void;
  onDelete: (id: string) => void | Promise<void>;
  /** Optional — adds an "Open in tab" entry routing to the per-DB deep page. */
  onOpenInTab?: (db: DatabaseOutput) => void;
}>;

export function buildRowActions(deps: RowActionsDeps): Action<unknown>[] {
  const { t } = deps;
  const openInTab: Action<DatabaseOutput>[] = deps.onOpenInTab
    ? [
        {
          id: 'openInTab',
          label: t('actions.openInTab'),
          icon: ExternalLink,
          run: (ctx) => deps.onOpenInTab!(ctx as DatabaseOutput),
        },
      ]
    : [];

  return asActions<DatabaseOutput>([
    {
      id: 'view',
      label: t('actions.view'),
      icon: Eye,
      run: (ctx) => deps.onViewDetails(ctx as DatabaseOutput),
    },
    ...(openInTab as Action<DatabaseOutput>[]),
    {
      id: 'delete',
      label: t('actions.delete'),
      icon: Trash2,
      intent: 'destructive',
      confirm: {
        title: t('deleteConfirmTitle'),
        description: (ctx) =>
          t('deleteConfirmDescription', { name: (ctx as DatabaseOutput).name }),
        confirmLabel: t('deleteConfirm'),
        cancelLabel: t('cancel'),
      },
      run: (ctx) => deps.onDelete((ctx as DatabaseOutput).id),
    },
  ]);
}

export type BulkActionsDeps = Readonly<{
  t: TFn;
  onCopyIds: (dbs: DatabaseOutput[]) => void | Promise<void>;
  onCopyJson: (dbs: DatabaseOutput[]) => void | Promise<void>;
  onExportCsv: (dbs: DatabaseOutput[]) => void | Promise<void>;
  onBulkDelete: (dbs: DatabaseOutput[]) => void | Promise<void>;
}>;

export function buildBulkActions(
  deps: BulkActionsDeps,
): BulkAction<unknown>[] {
  const { t } = deps;
  return asBulkActions<DatabaseOutput>([
    {
      id: 'copy-ids',
      label: t('copyIds'),
      icon: Copy,
      overflow: true,
      run: (rows) => deps.onCopyIds(rows as DatabaseOutput[]),
    },
    {
      id: 'copy-json',
      label: t('copyJson'),
      icon: Copy,
      overflow: true,
      run: (rows) => deps.onCopyJson(rows as DatabaseOutput[]),
    },
    {
      id: 'export-csv',
      label: t('exportCsv'),
      icon: Download,
      overflow: true,
      run: (rows) => deps.onExportCsv(rows as DatabaseOutput[]),
    },
    {
      id: 'delete',
      label: t('actions.delete'),
      icon: Trash2,
      destructive: true,
      confirm: {
        title: t('deleteConfirmTitle'),
        description: (rows) =>
          t('deleteConfirmDescription', {
            name: `${(rows as DatabaseOutput[]).length} databases`,
          }),
        confirmLabel: t('deleteConfirm'),
        cancelLabel: t('cancel'),
      },
      run: (rows) => deps.onBulkDelete(rows as DatabaseOutput[]),
    },
  ]);
}
