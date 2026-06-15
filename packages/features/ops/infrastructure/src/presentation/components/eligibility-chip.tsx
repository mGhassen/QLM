import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { NodeEligibility } from '@guepard/domain/entities';
import { cn } from '@guepard/ui/utils';

export type EligibilityChipProps = Readonly<{
  eligibility: NodeEligibility;
  onToggle?: (next: NodeEligibility) => void;
  /** Disable interaction (e.g. while a drain is owning eligibility). */
  disabled?: boolean;
  /** Show a "submitting" affordance during optimistic updates. */
  isSubmitting?: boolean;
  className?: string;
}>;

const CHIP_CLASSES: Record<NodeEligibility, string> = {
  eligible:
    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  ineligible: 'bg-muted text-muted-foreground border-border',
};

function EligibilityChipInner({
  eligibility,
  onToggle,
  disabled = false,
  isSubmitting = false,
  className,
}: EligibilityChipProps) {
  const { t } = useTranslation('nodes');
  const next: NodeEligibility =
    eligibility === 'eligible' ? 'ineligible' : 'eligible';

  const tooltip = t(
    eligibility === 'eligible'
      ? 'eligibility.tooltipEligible'
      : 'eligibility.tooltipIneligible',
  );

  const interactive = !disabled && !isSubmitting && onToggle !== undefined;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={eligibility === 'eligible'}
      aria-label={t('eligibility.toggle')}
      title={tooltip}
      disabled={!interactive}
      onClick={() => interactive && onToggle?.(next)}
      className={cn(
        'inline-flex items-center rounded-none border px-2.5 h-7 text-[10px] font-bold uppercase tracking-tight leading-none transition-all',
        CHIP_CLASSES[eligibility],
        interactive
          ? 'cursor-pointer hover:bg-foreground hover:text-background hover:border-foreground'
          : 'cursor-not-allowed opacity-70',
        isSubmitting && 'animate-pulse',
        className,
      )}
    >
      <span className="inline-block translate-y-[0.5px]">
        {t(`eligibility.${eligibility}`)}
      </span>
    </button>
  );
}

export const EligibilityChip = memo(EligibilityChipInner);
