import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';

import { Checkbox } from '@guepard/ui/checkbox';
import { RowActionMenu } from '@guepard/ui/action';
import type { Action } from '@guepard/ui/action';
import { DbProviderIcon } from '@guepard/ui/db-provider-icon';
import { cn } from '@guepard/ui/utils';

import type { DatabaseOutput } from '@guepard/domain/usecases';

import { PROVIDER_STYLES, STATUS_BADGE } from '../../application/constants';
import { DbProviderBadge } from '../cells/db-provider-badge';

export type DatabaseCardProps = Readonly<{
  database: DatabaseOutput;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean, shiftKey?: boolean) => void;
  onViewDetails?: (db: DatabaseOutput) => void;
  rowActions?: Action<unknown>[];
  flashClass?: string;
}>;

function DatabaseCardInner({
  database,
  selectionMode,
  selected,
  onSelect,
  onViewDetails,
  rowActions = [],
  flashClass,
}: DatabaseCardProps) {
  const { t } = useTranslation('databases');
  const providerStyle = PROVIDER_STYLES[database.provider];
  const statusClass = STATUS_BADGE[database.status as keyof typeof STATUS_BADGE];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (selectionMode) {
          onSelect?.(database.id, !selected, e.shiftKey);
        } else {
          onViewDetails?.(database);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (selectionMode) {
            onSelect?.(database.id, !selected);
          } else {
            onViewDetails?.(database);
          }
        }
      }}
      className={cn(
        'relative bg-card rounded-none border-2 p-4 flex flex-col gap-3 h-full',
        'cursor-pointer transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-foreground bg-primary/5'
          : 'border-border hover:bg-muted/40 hover:border-foreground',
        flashClass,
      )}
    >
      {/* Row 1 — identity + menu */}
      <div className="flex items-start gap-3">
        {/* Provider icon tile / checkbox */}
        <div
          className={cn(
            'h-12 w-12 shrink-0 flex items-center justify-center border-2',
            selectionMode
              ? 'border-border bg-muted/50'
              : providerStyle
                ? `${providerStyle.bg} ${providerStyle.border}`
                : 'bg-muted/50 border-border',
          )}
          onClick={(e) => {
            if (selectionMode) {
              e.stopPropagation();
              onSelect?.(database.id, !selected, e.shiftKey);
            }
          }}
        >
          {selectionMode ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelect?.(database.id, !!v)}
              className="rounded-none"
              aria-label={t('bulk.selectRow')}
            />
          ) : (
            DbProviderIcon({ provider: database.provider, size: 24, className: 'shrink-0' }) ?? (
              <Database
                className={cn(
                  'h-5 w-5',
                  providerStyle ? providerStyle.text : 'text-muted-foreground',
                )}
              />
            )
          )}
        </div>

        {/* Name + provider */}
        <div className="flex-1 min-w-0">
          <p className="text-[20px] font-black leading-none truncate uppercase tracking-tighter">
            {database.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <DbProviderBadge provider={database.provider} />
          </div>
        </div>

        {/* Three-dot menu */}
        {rowActions.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <RowActionMenu row={database} actions={rowActions} ariaLabel="" />
          </div>
        )}
      </div>

      {/* Row 2 — status + version chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'inline-flex items-center rounded-none border px-2 h-5',
            'text-[10px] font-black uppercase tracking-widest leading-none',
            statusClass,
          )}
        >
          {t(`status.${database.status}`)}
        </span>
        <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-mono tracking-normal leading-none text-foreground/70">
          v{database.version}
        </span>
        {database.compute?.performanceProfile?.labelName && (
          <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none text-foreground/70">
            {database.compute.performanceProfile.labelName}
          </span>
        )}
      </div>

      {/* Row 3 — FQDN */}
      {database.fqdn && (
        <p className="text-[11px] font-mono text-muted-foreground truncate">
          {database.fqdn}
        </p>
      )}
    </div>
  );
}

export const DatabaseCard = memo(DatabaseCardInner);
