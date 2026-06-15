import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Info, Lock, Zap, HardDrive, Layers } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@guepard/ui/accordion';
import { Alert, AlertDescription } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import { Input } from '@guepard/ui/input';
import { EntitySection } from '@guepard/ui/entity-primitives';
import { Sheet, SheetContent, SheetTitle } from '@guepard/ui/sheet';
import { cn } from '@guepard/ui/utils';

import { COMPUTE_TIERS } from '../../application/compute-tiers';
import { useInfrastructureSettings } from '../../application/use-infrastructure-settings';

const LABEL = 'text-[11px] font-bold tracking-tight text-muted-foreground block mb-1.5';
const NUM_INPUT =
  'rounded-none border border-border bg-background h-10 text-[13px] font-bold tracking-tight focus-visible:ring-0 focus-visible:border-primary px-3 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors';

type DiskType = 'gp3' | 'io2';

const DISK_TYPE_SPECS: Record<DiskType, { maxIops: number; maxThroughput: number; maxSizeTb: number }> = {
  gp3: { maxIops: 16_000, maxThroughput: 1_000, maxSizeTb: 16 },
  io2: { maxIops: 80_000, maxThroughput: 4_000, maxSizeTb: 60 },
};

type Props = Readonly<{ projectId: string }>;

export function InfrastructureSettingsTab({ projectId }: Props) {
  const { t } = useTranslation(['infrastructure', 'common']);
  const { data: settings } = useInfrastructureSettings(projectId);

  const diskGb = settings?.diskGb ?? 8;
  const usedDb = settings?.usedDb ?? 0;
  const usedWal = settings?.usedWal ?? 0;
  const usedSys = settings?.usedSys ?? 0;
  const usedTotal = usedDb + usedWal + usedSys;

  const [computeId, setComputeId] = useState<string>(settings?.computeTier ?? 'micro');
  const [diskType, setDiskType] = useState<DiskType>((settings?.diskType as DiskType) ?? 'gp3');
  const [iops, setIops] = useState(settings?.iops ?? 3_000);
  const [throughput, setThroughput] = useState(settings?.throughput ?? 125);
  const [autoscaleGrowthPct, setAutoscaleGrowthPct] = useState(10);
  const [autoscaleMinGb, setAutoscaleMinGb] = useState(1);
  const [autoscaleMaxGb, setAutoscaleMaxGb] = useState(diskGb * 8);
  const [tiersOpen, setTiersOpen] = useState(false);
  const [spendCapEnabled, setSpendCapEnabled] = useState(true);

  const diskSegments = [
    { key: 'db', labelKey: 'settings.disk.db', gb: usedDb, className: 'bg-foreground' },
    { key: 'wal', labelKey: 'settings.disk.wal', gb: usedWal, className: 'bg-violet-500' },
    { key: 'sys', labelKey: 'settings.disk.system', gb: usedSys, className: 'bg-fuchsia-400' },
  ] as const;

  const freeGb = diskGb - usedTotal;
  const diskSpecs = DISK_TYPE_SPECS[diskType];

  return (
    <div className="max-w-5xl space-y-10">
      {/* ── Compute size ── */}
      <EntitySection title={t('settings.compute.title')}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,200px)_1fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('settings.compute.description')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none border font-bold tracking-tight text-[11px] h-8 px-4 cursor-pointer"
            >
              {t('settings.compute.docs')}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COMPUTE_TIERS.map((tier) => {
                const locked = Boolean(tier.locked);
                const selected = !locked && computeId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setComputeId(tier.id)}
                    className={cn(
                      'border rounded-none p-4 text-left transition-all duration-150',
                      locked && 'cursor-not-allowed opacity-40 grayscale',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/30 hover:border-foreground/50 cursor-pointer',
                    )}
                  >
                    {/* Name row */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-tight">
                        {t(`settings.tier.${tier.nameKey}`)}
                      </span>
                      {locked ? (
                        <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <span
                          className={cn(
                            'text-[10px] font-bold tracking-tight px-1.5 py-0.5 border rounded-none shrink-0',
                            tier.dedicated
                              ? 'bg-foreground/10 border-foreground/20 text-foreground'
                              : 'bg-muted border-border/50 text-muted-foreground',
                          )}
                        >
                          {tier.dedicated
                            ? t('settings.compute.dedicated')
                            : t('settings.compute.shared')}
                        </span>
                      )}
                    </div>
                    {/* Price */}
                    {tier.price ? (
                      <p className="text-muted-foreground mb-3 text-xs font-mono">
                        {tier.price}
                      </p>
                    ) : null}
                    {/* Specs */}
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>{t('settings.compute.memory', { gb: tier.memoryGb })}</li>
                      <li>{t('settings.compute.connections', { count: tier.connections })}</li>
                      <li>{t('settings.compute.maxDb', { gb: tier.maxDbGb })}</li>
                    </ul>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTiersOpen(true)}
              className="rounded-none border font-bold tracking-tight text-[11px] h-10 px-6 cursor-pointer"
            >
              {t('settings.compute.showAll')}
            </Button>
          </div>
        </div>
      </EntitySection>

      <Sheet open={tiersOpen} onOpenChange={setTiersOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[540px] border-l border-border bg-background rounded-none">
          <div className="shrink-0 border-b border-border bg-muted/5 px-6 pt-8 pb-6">
            <SheetTitle className="sr-only">{t('settings.compute.showAll')}</SheetTitle>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 flex items-center justify-center border border-border rounded-none bg-background">
                <Layers className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight uppercase leading-none">
                  {t('settings.compute.allSizes')}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground font-bold tracking-tight opacity-70">
                  {t('settings.compute.allDescription')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-3">
            {COMPUTE_TIERS.map((tier) => {
              const locked = Boolean(tier.locked);
              const selected = !locked && computeId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (!locked) {
                      setComputeId(tier.id);
                      setTiersOpen(false);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-6 border rounded-none p-5 text-left transition-all duration-150',
                    locked && 'cursor-not-allowed opacity-40 grayscale',
                    selected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:bg-muted/30 hover:border-foreground/50 cursor-pointer',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold tracking-tight uppercase">{t(`settings.tier.${tier.nameKey}`)}</span>
                      {locked ? (
                        <Lock className="text-muted-foreground h-3.5 w-3.5" />
                      ) : (
                        <span className="text-xs font-mono font-bold tracking-tight">{tier.price}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 opacity-70">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold tracking-tight uppercase text-muted-foreground">{t('settings.compute.memoryLabel')}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">{t('settings.compute.memory', { gb: tier.memoryGb })}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold tracking-tight uppercase text-muted-foreground">{t('settings.compute.connectionsLabel')}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">{tier.connections}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold tracking-tight uppercase text-muted-foreground">{t('settings.compute.storageLabel')}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">{t('settings.compute.maxDb', { gb: tier.maxDbGb })}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="shrink-0 p-6 border-t border-border bg-muted/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTiersOpen(false)}
              className="w-full rounded-none h-12 font-bold tracking-tight text-sm border cursor-pointer"
            >
              {t('close', { ns: 'common' })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Spend cap alert ── */}
      {spendCapEnabled ? (
        <Alert className="border border-amber-500/30 bg-amber-500/10 rounded-none">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold tracking-tight text-amber-900/80">{t('settings.disk.spendCapAlert')}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSpendCapEnabled(false)}
              className="shrink-0 rounded-none border border-amber-500/40 font-bold tracking-tight text-[11px] h-8 px-4 cursor-pointer hover:bg-amber-100 uppercase"
            >
              {t('settings.disk.disableSpendCap')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between rounded-none">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-bold tracking-tight uppercase text-emerald-800">{t('settings.disk.spendCapDisabled')}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setSpendCapEnabled(true)}
            className="h-auto p-0 text-[10px] font-bold tracking-tight uppercase hover:bg-transparent underline underline-offset-4"
          >
            {t('settings.disk.enableSpendCap')}
          </Button>
        </div>
      )}

      {/* ── Disk size ── */}
      <EntitySection title={t('settings.disk.title')}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,200px)_1fr] lg:items-start">
          <div className="space-y-3">
            <Input
              readOnly
              value={`${diskGb} GB`}
              className="max-w-[120px] rounded-none border border-border bg-background h-10 text-[13px] font-bold tracking-tight"
            />
            <p className="text-muted-foreground text-sm">
              {t('settings.disk.planIncludes', { total: diskGb })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none border font-bold tracking-tight text-[11px] h-8 px-4 cursor-pointer uppercase"
            >
              {t('settings.disk.docs')}
            </Button>
          </div>

          <div className="space-y-8">
            {/* Disk type selector */}
            <div>
              <p className={LABEL}>{t('settings.disk.type')}</p>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {(['gp3', 'io2'] as const).map((dt) => {
                  const specs = DISK_TYPE_SPECS[dt];
                  return (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDiskType(dt)}
                      className={cn(
                        'border rounded-none p-3 text-left transition-all duration-150 cursor-pointer',
                        diskType === dt
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:bg-muted/30 hover:border-foreground/50',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {dt === 'io2'
                          ? <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          : <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-[11px] font-bold tracking-tight uppercase">{dt}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono font-bold tracking-tight">
                        {t('settings.disk.typeMaxIops', { iops: specs.maxIops.toLocaleString() })}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono font-bold tracking-tight">
                        {t('settings.disk.typeMaxSize', { tb: specs.maxSizeTb })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* IOPS + Throughput (gp3 only — io2 links IOPS to disk size) */}
            {diskType === 'gp3' && (
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className={cn(!spendCapEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none')}>
                  <label className={LABEL}>{t('settings.disk.iops')}</label>
                  <input
                    type="number"
                    min={3_000}
                    max={diskSpecs.maxIops}
                    value={iops}
                    disabled={spendCapEnabled}
                    onChange={(e) => setIops(Number(e.target.value))}
                    className={NUM_INPUT}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                    {t('settings.disk.iopsRange', { min: '3,000', max: '16,000' })}
                  </p>
                </div>
                <div className={cn(!spendCapEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none')}>
                  <label className={LABEL}>{t('settings.disk.throughput')}</label>
                  <input
                    type="number"
                    min={125}
                    max={diskSpecs.maxThroughput}
                    value={throughput}
                    disabled={spendCapEnabled}
                    onChange={(e) => setThroughput(Number(e.target.value))}
                    className={NUM_INPUT}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                    {t('settings.disk.throughputRange', { min: '125', max: '1,000' })}
                  </p>
                </div>
              </div>
            )}

            {/* Disk usage bar */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold tracking-tight uppercase text-muted-foreground">
                {t('settings.disk.used', {
                  used: usedTotal.toFixed(2),
                  total: diskGb,
                })}
              </p>
              <div className="flex h-4 w-full max-w-xl overflow-hidden border border-border bg-muted/10 rounded-none">
                {diskSegments.map((s) => (
                  <div
                    key={s.key}
                    className={cn(s.className, 'min-w-px shrink-0')}
                    style={{ width: `${(s.gb / diskGb) * 100}%` }}
                    title={`${t(s.labelKey)}: ${s.gb} GB`}
                  />
                ))}
                <div
                  className="bg-muted-foreground/15 min-w-px flex-1"
                  title={`${t('settings.disk.available')}: ${freeGb.toFixed(2)} GB`}
                />
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {diskSegments.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center gap-2 text-[10px] font-bold tracking-tight uppercase text-muted-foreground"
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-none border border-black/10', s.className)} />
                    {t(s.labelKey)}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-[10px] font-bold tracking-tight uppercase text-muted-foreground">
                  <span className="bg-muted-foreground/20 h-2.5 w-2.5 shrink-0 rounded-none border border-black/10" />
                  {t('settings.disk.available')}
                </li>
              </ul>
            </div>

            <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
              {t('settings.disk.note', {
                db: usedDb,
                wal: usedWal,
                sys: usedSys,
              })}
            </p>
          </div>
        </div>
      </EntitySection>

      {/* ── Advanced disk settings ── */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced" className="border border-border px-4 rounded-none">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="text-left">
              <div className="text-[11px] font-bold tracking-tight uppercase">
                {t('settings.disk.advanced')}
              </div>
              <p className="text-muted-foreground mt-1 text-[11px] font-bold uppercase tracking-tight opacity-40">
                {t('settings.disk.advancedDescription')}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-6 sm:grid-cols-3 pt-2 pb-4">
              <div>
                <label className={LABEL}>{t('settings.disk.autoscaleGrowth')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={autoscaleGrowthPct}
                    onChange={(e) => setAutoscaleGrowthPct(Number(e.target.value))}
                    className={NUM_INPUT}
                  />
                  <span className="text-sm font-bold text-muted-foreground shrink-0">%</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t('settings.disk.autoscaleGrowthHint')}
                </p>
              </div>
              <div>
                <label className={LABEL}>{t('settings.disk.autoscaleMin')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={autoscaleMinGb}
                    onChange={(e) => setAutoscaleMinGb(Number(e.target.value))}
                    className={NUM_INPUT}
                  />
                  <span className="text-sm font-bold text-muted-foreground shrink-0">GB</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t('settings.disk.autoscaleMinHint')}
                </p>
              </div>
              <div>
                <label className={LABEL}>{t('settings.disk.autoscaleMax')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={diskGb}
                    value={autoscaleMaxGb}
                    onChange={(e) => setAutoscaleMaxGb(Number(e.target.value))}
                    className={NUM_INPUT}
                  />
                  <span className="text-sm font-bold text-muted-foreground shrink-0">GB</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t('settings.disk.autoscaleMaxHint')}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
