import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShell } from '@guepard/shell-runtime';

import { Globe, Plus, Trash2, X, Database } from 'lucide-react';
import { Button } from '@guepard/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@guepard/ui/sheet';
import { cn } from '@guepard/ui/utils';

import { SELECTABLE_TIERS } from '../../application/compute-tiers';
import { useReplicas } from '../../application/use-replicas';

const REPLICA_STATUS_CLASSES = {
  available: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  provisioning: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  degraded: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  error: 'bg-destructive/15 text-destructive border-destructive/30',
} as const;

const REPLICA_DOT_CLASSES = {
  available: 'bg-emerald-500',
  provisioning: 'bg-amber-400 animate-pulse',
  degraded: 'bg-amber-400',
  error: 'bg-destructive',
} as const;

const AVAILABLE_REGIONS = [
  { value: 'us-east-1', provider: 'AWS' },
  { value: 'us-west-2', provider: 'AWS' },
  { value: 'eu-west-1', provider: 'AWS' },
  { value: 'eu-central-1', provider: 'AWS' },
  { value: 'ap-southeast-1', provider: 'AWS' },
  { value: 'us-central1', provider: 'GCP' },
  { value: 'europe-west1', provider: 'GCP' },
  { value: 'asia-east1', provider: 'GCP' },
] as const;

const MOCK_LOAD_BALANCER = 'lb.db.rasm.ai';

const SELECT =
  'w-full rounded-none border border-border bg-background h-10 text-sm font-bold px-3 cursor-pointer focus:outline-none focus:border-foreground transition-colors';

export function InfrastructureReplicasSection() {
  const { t } = useTranslation('infrastructure');
  const shell = useShell();
  const { query, add, remove } = useReplicas(shell.projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>(AVAILABLE_REGIONS[0].value);
  const [selectedTier, setSelectedTier] = useState<string>(SELECTABLE_TIERS[0]?.id ?? 'micro');

  const replicas = query.data ?? [];

  function handleAdd() {
    const region = AVAILABLE_REGIONS.find((r) => r.value === selectedRegion);
    add.mutate(
      {
        projectId: shell.projectId,
        region: selectedRegion,
        provider: region?.provider ?? 'AWS',
        computeTier: selectedTier,
      },
      { onSuccess: () => setAddOpen(false) },
    );
  }

  function handleRemove(id: string) {
    remove.mutate({ id });
  }

  return (
    <>
      <div className="space-y-4">
        {/* Load balancer endpoint — visible when replicas exist */}
        {replicas.length > 0 && (
          <div className="flex items-center gap-3 border border-border bg-muted/20 px-4 py-3">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                {t('replicas.loadBalancer')}
              </p>
              <p className="font-mono text-xs font-semibold truncate">{MOCK_LOAD_BALANCER}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-none border font-bold uppercase tracking-tight text-[10px] cursor-pointer shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              {t('replicas.add')}
            </Button>
          </div>
        )}

        {/* Replica list */}
        {replicas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border border-dashed border-border">
            <div className="flex h-12 w-12 items-center justify-center border border-border bg-muted/50 rounded-none">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('replicas.empty.title')}</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {t('replicas.empty.description')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-none border font-bold uppercase tracking-tight text-xs h-10 cursor-pointer"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('replicas.add')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {replicas.map((replica) => (
              <div
                key={replica.id}
                className="flex items-center gap-4 border border-border bg-muted/10 px-4 py-3"
              >
                <div
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-none',
                    REPLICA_DOT_CLASSES[replica.status],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-semibold">{replica.region}</p>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                    {replica.provider}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 border border-border/50 bg-muted rounded-none">
                  {t(`settings.tier.${replica.computeTier}`)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-none border px-2 h-6',
                    'text-[9px] font-bold uppercase tracking-tight leading-none',
                    REPLICA_STATUS_CLASSES[replica.status],
                  )}
                >
                  {t(`replicas.status.${replica.status}`)}
                </span>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => handleRemove(replica.id)}
                  className="shrink-0 h-7 w-7 flex items-center justify-center border border-border rounded-none cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('replicas.remove')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add replica sheet ── */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] border-l-2 border-border bg-background rounded-none"
        >
          <div className="shrink-0 border-b-2 border-border bg-muted/20 px-6 pt-6 pb-4">
            <SheetTitle className="sr-only">{t('replicas.sheet.title')}</SheetTitle>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center border border-border rounded-none bg-muted/50">
                  <Database className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight uppercase leading-none">
                    {t('replicas.sheet.title')}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('replicas.sheet.description')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="shrink-0 h-8 w-8 flex items-center justify-center border border-border rounded-none cursor-pointer hover:bg-foreground hover:text-background hover:border-foreground transition-all"
                aria-label={t('replicas.sheet.cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
            {/* Region */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-1.5">
                {t('replicas.sheet.region')}
              </p>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className={SELECT}
              >
                {AVAILABLE_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.value} · {r.provider}
                  </option>
                ))}
              </select>
            </div>

            {/* Compute size */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-2">
                {t('replicas.sheet.computeSize')}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SELECTABLE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={cn(
                      'flex items-center justify-between border rounded-none px-4 py-3 text-left transition-all duration-150 cursor-pointer',
                      selectedTier === tier.id
                        ? 'border-foreground bg-primary/10 shadow-none'
                        : 'border-border hover:bg-muted/30 hover:border-foreground/50',
                    )}
                  >
                    <span className="text-xs font-bold uppercase tracking-tight">
                      {t(`settings.tier.${tier.nameKey}`)}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {t('settings.compute.memory', { gb: tier.memoryGb })}
                      {' · '}
                      {t('settings.compute.connections', { count: tier.connections })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t-2 border-border px-6 py-3 bg-muted/30 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-none font-bold uppercase tracking-tight text-xs border cursor-pointer"
              onClick={() => setAddOpen(false)}
            >
              {t('replicas.sheet.cancel')}
            </Button>
            <Button
              type="button"
              disabled={add.isPending}
              className="flex-1 h-10 rounded-none font-bold uppercase tracking-tight text-xs border cursor-pointer"
              onClick={handleAdd}
            >
              {t('replicas.sheet.confirm')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
