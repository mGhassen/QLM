import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NodeDrain } from '@guepard/domain/entities';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@guepard/ui/alert-dialog';
import { Button } from '@guepard/ui/button';
import { Checkbox } from '@guepard/ui/checkbox';
import { Label } from '@guepard/ui/label';
import { cn } from '@guepard/ui/utils';

type DeadlinePreset = '15m' | '30m' | '1h' | '4h' | 'none';

const PRESET_MINUTES: Record<DeadlinePreset, number | null> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  none: null,
};

export type DrainDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeName: string;
  onConfirm: (input: {
    drain: NodeDrain;
    setIneligibleOnStart: boolean;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}>;

function DrainDialogInner({
  open,
  onOpenChange,
  nodeName,
  onConfirm,
  isSubmitting = false,
}: DrainDialogProps) {
  const { t } = useTranslation('nodes');
  const [preset, setPreset] = useState<DeadlinePreset>('30m');
  const [ignoreSystemJobs, setIgnoreSystemJobs] = useState(false);
  const [force, setForce] = useState(false);
  const [setIneligibleOnStart, setSetIneligibleOnStart] = useState(true);

  function handleSubmit() {
    const minutes = PRESET_MINUTES[preset];
    const deadline =
      minutes === null
        ? undefined
        : new Date(Date.now() + minutes * 60_000).toISOString();
    void onConfirm({
      drain: {
        active: true,
        deadline,
        ignoreSystemJobs,
        force,
      },
      setIneligibleOnStart,
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-none border border-border bg-background max-w-md p-8 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold tracking-tight mb-2">
            {t('drain.confirm.title', { name: nodeName })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm font-medium tracking-tight mb-4 leading-relaxed">
            {t('drain.confirm.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-6 space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-muted-foreground/60 text-[10px] font-bold tracking-tight uppercase mb-1 block">
              {t('drain.deadline')}
            </legend>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(PRESET_MINUTES) as DeadlinePreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={cn(
                    'h-10 border rounded-none text-[11px] font-bold tracking-tight transition-all cursor-pointer',
                    preset === key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`drain.deadlinePresets.${presetKey(key)}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <CheckboxRow
            id="drain-ignore-system"
            checked={ignoreSystemJobs}
            onCheckedChange={setIgnoreSystemJobs}
            label={t('drain.ignoreSystemJobs')}
            help={t('drain.ignoreSystemJobsHelp')}
          />
          <CheckboxRow
            id="drain-force"
            checked={force}
            onCheckedChange={setForce}
            label={t('drain.force')}
            help={t('drain.forceHelp')}
          />
          <CheckboxRow
            id="drain-set-ineligible"
            checked={setIneligibleOnStart}
            onCheckedChange={setSetIneligibleOnStart}
            label={t('drain.setIneligibleOnStart')}
            help={t('drain.setIneligibleOnStartHelp')}
          />
        </div>

        <AlertDialogFooter className="mt-8 gap-3 sm:gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="rounded-none h-10 border border-border bg-background hover:bg-muted text-[11px] font-bold tracking-tight transition-all m-0 shadow-none"
          >
            {t('drain.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="rounded-none h-10 border border-amber-500 bg-amber-500 text-amber-950 hover:bg-amber-600 font-bold tracking-tight text-[11px] transition-all m-0 industrial-button"
          >
            {isSubmitting ? t('drain.submitting') : t('drain.submit')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function presetKey(p: DeadlinePreset): string {
  switch (p) {
    case '15m':
      return 'fifteenMinutes';
    case '30m':
      return 'thirtyMinutes';
    case '1h':
      return 'oneHour';
    case '4h':
      return 'fourHours';
    case 'none':
      return 'none';
  }
}

function CheckboxRow({
  id,
  checked,
  onCheckedChange,
  label,
  help,
}: Readonly<{
  id: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  help: string;
}>) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 rounded-none border"
      />
      <div className="flex flex-col min-w-0">
        <Label
          htmlFor={id}
          className="text-[12px] font-bold tracking-tight cursor-pointer"
        >
          {label}
        </Label>
        <p className="text-[11px] font-medium text-muted-foreground/80 mt-0.5">
          {help}
        </p>
      </div>
    </div>
  );
}

export const DrainDialog = memo(DrainDialogInner);
