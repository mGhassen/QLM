import { useMemo, type CSSProperties } from 'react';
import type { ResolvedPageSetup } from '#/lib/page-setup';
import { pageSetupToStyle } from '#/lib/page-setup';

interface StudioPageRulerProps {
  setup: ResolvedPageSetup;
  style?: CSSProperties;
}

const TICK_STEP_MM = 5;
const LABEL_STEP_MM = 20;

type TickKind = 'major' | 'minor';

export default function StudioPageRuler({
  setup,
  style,
}: StudioPageRulerProps) {
  const { widthMm, margins } = setup;

  const ticks = useMemo(() => {
    const out: { mm: number; kind: TickKind; label: string | null }[] = [];
    for (let mm = 0; mm <= widthMm; mm += TICK_STEP_MM) {
      const isMajor = mm % 10 === 0;
      const showLabel = mm % LABEL_STEP_MM === 0 || mm === widthMm;
      out.push({
        mm,
        kind: isMajor ? 'major' : 'minor',
        label: showLabel ? String(mm / 10) : null,
      });
    }
    return out;
  }, [widthMm]);

  const contentLeftMm = margins.left;
  const contentRightMm = widthMm - margins.right;

  return (
    <div
      className="studio-ruler-anchor"
      aria-hidden
      style={pageSetupToStyle(setup)}
    >
      <div className="studio-ruler" style={style}>
        <div className="studio-ruler-track" />
        <div
          className="studio-ruler-margin studio-ruler-margin-left"
          style={{ width: `${margins.left}mm` }}
        />
        <div
          className="studio-ruler-margin studio-ruler-margin-right"
          style={{ width: `${margins.right}mm` }}
        />
        <div
          className="studio-ruler-boundary studio-ruler-boundary-left"
          style={{ left: `${contentLeftMm}mm` }}
        />
        <div
          className="studio-ruler-boundary studio-ruler-boundary-right"
          style={{ left: `${contentRightMm}mm` }}
        />
        {ticks.map(({ mm, kind, label }) => (
          <span
            key={mm}
            className={`studio-ruler-tick studio-ruler-tick-${kind}`}
            style={{ left: `${mm}mm` }}
          >
            {label != null && (
              <span className="studio-ruler-label">{label}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
