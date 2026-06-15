import type { BreakVariant } from '#/lib/breaks';
import { BREAK_LABELS } from '#/lib/breaks';

interface BreakProps {
  variant?: BreakVariant;
  studioMode?: boolean;
  showStudioChrome?: boolean;
}

export default function Break({
  variant = 'page',
  studioMode,
  showStudioChrome,
}: BreakProps) {
  const label = BREAK_LABELS[variant] ?? BREAK_LABELS.page;

  return (
    <div
      className={`doc-break doc-break-${variant}${studioMode && showStudioChrome ? ' doc-break-studio' : ''}`}
      aria-label={label}
      data-break-variant={variant}
    >
      {studioMode && showStudioChrome && (
        <span className="doc-break-label">
          <span className="doc-break-line" />
          {label}
          <span className="doc-break-line" />
        </span>
      )}
    </div>
  );
}
