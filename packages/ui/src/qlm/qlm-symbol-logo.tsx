import { forwardRef, type SVGAttributes } from 'react';
import { cn } from '../lib/utils';

/** Mark-only path from brand SVGs (`QLM Logo.svg` / `logo-qlm-dark.svg`); wordmark paths omitted. */
const SYMBOL_PATH =
  'm56.16,125.94c-3.7-20.99-20.14-37.43-41.13-41.13h0c-4.74-.83-9.21-3.55-12.19-8.18-3.79-5.89-3.79-13.35,0-19.24,2.98-4.63,7.45-7.34,12.18-8.17h0c17.48-3.08,31.16-16.76,34.24-34.24h0c.79-4.52,3.31-8.8,7.57-11.78,6.02-4.2,14.13-4.28,20.21-.17,9.76,6.6,10.69,19.97,2.8,27.86-2.73,2.73-6.11,4.4-9.64,5.02h0c-7.52,1.33-14.35,4.62-19.92,9.34-7.36,6.23-4.74,18.17,4.52,20.88,19.37,5.67,40.7,3.23,58.68-7.67,7.37-4.48,17.25-3.21,23.2,3.81,5.66,6.68,5.64,16.66-.04,23.32-2.88,3.38-6.67,5.41-10.65,6.11h0c-17.48,3.08-31.16,16.77-34.24,34.24h0c-.83,4.73-3.55,9.2-8.17,12.18-5.89,3.79-13.35,3.79-19.24,0-4.63-2.98-7.34-7.45-8.17-12.18h0Zm23.5-23.51c5.78-2.4,10.91-6.04,15.05-10.59,4.58-5.04,2.61-13.14-3.78-15.49-11.93-4.39-24.81-5.6-37.31-3.53-7.49,1.24-10.61,10.34-5.55,16.01,5.44,6.09,12.33,10.85,20.14,13.76,3.71,1.38,7.79,1.36,11.45-.15Z';

export type QLMSymbolLogoProps = SVGAttributes<SVGSVGElement> & {
  /** Fill for the symbol; default brand yellow `#ffcb51`. */
  symbolFill?: string;
};

/**
 * QLM mark only (no wordmark). Use in shell chrome, favicon-style slots, etc.
 * Pair with `group` + `group-hover:` on an ancestor for a light specular lift (`brightness` on the SVG).
 * ViewBox includes padding so the glyph does not fill edge-to-edge in fixed icon slots (e.g. `size-8`).
 */
export const QLMSymbolLogo = forwardRef<
  SVGSVGElement,
  QLMSymbolLogoProps
>(function QLMSymbolLogo(
  {
    className,
    symbolFill = '#ffcb51',
    role,
    'aria-label': ariaLabel = 'QLM',
    'aria-hidden': ariaHidden,
    ...props
  },
  ref,
) {
  const decorative = ariaHidden === true;
  return (
    <svg
      ref={ref}
      role={decorative ? 'presentation' : (role ?? 'img')}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={ariaHidden}
      viewBox="-22 -18 156 164"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-[filter] duration-200 ease-out group-hover:brightness-110 group-data-[state=open]:brightness-110',
        className,
      )}
      {...props}
    >
      <path fill={symbolFill} d={SYMBOL_PATH} />
    </svg>
  );
});
