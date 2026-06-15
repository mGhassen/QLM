import type { CSSProperties } from 'react';

export type DocPageFormat =
  | 'a3'
  | 'a4'
  | 'a5'
  | 'letter'
  | 'legal'
  | 'tabloid'
  | 'executive';

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
  label: string;
  printSize: string;
}

export const PAGE_FORMATS: Record<DocPageFormat, PageDimensions> = {
  a3: { widthMm: 297, heightMm: 420, label: 'A3', printSize: 'A3' },
  a4: { widthMm: 210, heightMm: 297, label: 'A4', printSize: 'A4' },
  a5: { widthMm: 148, heightMm: 210, label: 'A5', printSize: 'A5' },
  letter: {
    widthMm: 216,
    heightMm: 279,
    label: 'US Letter',
    printSize: 'letter',
  },
  legal: { widthMm: 216, heightMm: 356, label: 'US Legal', printSize: 'legal' },
  tabloid: {
    widthMm: 279,
    heightMm: 432,
    label: 'Tabloid',
    printSize: 'tabloid',
  },
  executive: {
    widthMm: 184,
    heightMm: 267,
    label: 'Executive',
    printSize: 'executive',
  },
};

export function resolvePageFormat(
  format: DocPageFormat | undefined,
): PageDimensions {
  return PAGE_FORMATS[format ?? 'a4'];
}

export function pageFormatToStyle(
  format: DocPageFormat | undefined,
): CSSProperties {
  const { widthMm, heightMm } = resolvePageFormat(format);
  return {
    '--doc-page-width': `${widthMm}mm`,
    '--doc-page-height': `${heightMm}mm`,
  } as CSSProperties;
}
