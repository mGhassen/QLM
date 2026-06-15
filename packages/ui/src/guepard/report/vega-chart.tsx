import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import embed from 'vega-embed';
import { ClientOnly } from '../client-only';

/** Matches `next-themes` / Storybook: `class="dark"` on `<html>`. */
function useDocumentDarkClass(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  return isDark;
}

type VegaLiteSpec = Record<string, unknown>;

const MARK_CONFIG = {
  point: {
    size: 60,
    filled: true,
  },
  line: {
    strokeWidth: 2.5,
  },
  bar: {
    cornerRadiusEnd: 4,
  },
};

const RANGE_CATEGORY = [
  '#14b8a6',
  '#38bdf8',
  '#c084fc',
  '#2dd4bf',
  '#0ea5e9',
  '#a78bfa',
  '#f472b6',
  '#34d399',
];

/** Light — transparent canvas; axis text readable on `bg-muted` wrapper */
const CHART_THEME_LIGHT = {
  background: 'transparent',
  view: { stroke: null },
  font: 'system-ui, -apple-system, sans-serif',
  fontSize: 11,
  padding: 16,
  axis: {
    domain: false,
    domainColor: '#a3a3a3',
    grid: true,
    gridColor: '#d4d4d8',
    gridOpacity: 0.95,
    labelColor: '#52525b',
    labelFontSize: 11,
    labelFontWeight: 500,
    titleColor: '#18181b',
    titleFontSize: 12,
    titleFontWeight: 600,
    tickColor: '#a1a1aa',
    tickSize: 4,
  },
  axisX: {
    labelAngle: 0,
    labelPadding: 8,
  },
  axisY: {
    labelAlign: 'left',
    labelPadding: 8,
  },
  legend: {
    labelColor: '#3f3f46',
    labelFontSize: 11,
    titleColor: '#18181b',
    titleFontSize: 12,
    titleFontWeight: 600,
    symbolSize: 100,
    symbolStrokeWidth: 2,
  },
  legendDiscrete: {
    symbolType: 'circle',
  },
  title: {
    color: '#18181b',
    fontSize: 14,
    fontWeight: 600,
  },
  mark: MARK_CONFIG,
  range: {
    category: RANGE_CATEGORY,
    ordinal: ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'],
  },
};

/** Dark dashboard — polished, minimal */
const CHART_THEME_DARK = {
  background: 'transparent',
  view: { stroke: null },
  font: 'system-ui, -apple-system, sans-serif',
  fontSize: 11,
  padding: 16,
  axis: {
    domain: false,
    domainColor: '#525252',
    grid: true,
    gridColor: '#404040',
    gridOpacity: 0.8,
    labelColor: '#e5e5e5',
    labelFontSize: 11,
    labelFontWeight: 500,
    titleColor: '#fafafa',
    titleFontSize: 12,
    titleFontWeight: 600,
    tickColor: '#525252',
    tickSize: 4,
  },
  axisX: {
    labelAngle: 0,
    labelPadding: 8,
  },
  axisY: {
    labelAlign: 'left',
    labelPadding: 8,
  },
  legend: {
    labelColor: '#e5e5e5',
    labelFontSize: 11,
    titleColor: '#fafafa',
    titleFontSize: 12,
    titleFontWeight: 600,
    symbolSize: 100,
    symbolStrokeWidth: 2,
  },
  legendDiscrete: {
    symbolType: 'circle',
  },
  title: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: 600,
  },
  mark: MARK_CONFIG,
  range: {
    category: RANGE_CATEGORY,
    ordinal: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'],
  },
};

const chartSurfaceClass =
  'my-6 min-h-[200px] rounded-none border border-border bg-muted p-4 dark:bg-zinc-950/90';

type VegaChartInnerProps = {
  spec: VegaLiteSpec;
};

function VegaChartInner({ spec }: VegaChartInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isDark = useDocumentDarkClass();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let finalize: (() => void) | undefined;

    const base = isDark ? CHART_THEME_DARK : CHART_THEME_LIGHT;

    const specWithTheme = {
      ...spec,
      config: { ...base, ...((spec.config ?? {}) as object) },
    };

    embed(container, specWithTheme as Parameters<typeof embed>[1], {
      actions: false,
      renderer: 'svg',
    })
      .then((result) => {
        finalize = () => result.finalize();
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      });

    return () => {
      finalize?.();
    };
  }, [spec, isDark]);

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-none border p-4 text-sm">
        <span className="font-medium">Chart error:</span> {error}
      </div>
    );
  }

  return <div ref={containerRef} className={chartSurfaceClass} />;
}

type VegaChartProps = {
  specJson: string;
};

export function VegaChart({ specJson }: VegaChartProps) {
  let spec: VegaLiteSpec | null = null;
  let parseError: string | null = null;

  try {
    spec = JSON.parse(specJson) as VegaLiteSpec;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  if (parseError || spec === null) {
    return (
      <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-none border p-4 text-sm">
        <span className="font-medium">Invalid chart spec:</span> {parseError}
      </div>
    );
  }

  return (
    <ClientOnly
      fallback={
        <div className="border-border bg-muted my-6 flex h-48 items-center justify-center rounded-none border p-4 dark:bg-zinc-950/90">
          <div className="bg-foreground/15 dark:bg-foreground/25 h-8 w-8 animate-pulse rounded-full" />
        </div>
      }
    >
      <VegaChartInner spec={spec} />
    </ClientOnly>
  );
}
