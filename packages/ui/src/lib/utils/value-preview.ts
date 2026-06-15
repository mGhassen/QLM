export type ValuePreviewOptions = {
  /** Target max characters for the inline preview. */
  maxPreviewChars?: number;
  /** Max characters allowed in tooltip content (safety cap). */
  maxTooltipChars?: number;
};

const DEFAULT_MAX_PREVIEW_CHARS = 32;
const DEFAULT_MAX_TOOLTIP_CHARS = 20_000;

export function truncateEnd(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars - 1)) + '…';
}

function previewScalar(value: unknown): string | null {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string')
    return value.length > 24 ? `${value.slice(0, 23)}…` : value;
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return null;
}

function objectPreview(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  // Prefer common "meaningful" keys first (keeps previews useful for payload-like JSON).
  const preferred = [
    'id',
    'name',
    'title',
    'slug',
    'status',
    'type',
    'kind',
    'source',
    'provider',
    'created_at',
    'updated_at',
  ];

  const ordered = [
    ...preferred.filter((k) => k in obj),
    ...keys.filter((k) => !preferred.includes(k)),
  ];

  const parts: string[] = [];
  for (const key of ordered) {
    if (parts.length >= 4) break;
    const v = obj[key];
    const scalar = previewScalar(v);
    if (scalar !== null) {
      parts.push(`${key}=${JSON.stringify(scalar)}`);
      continue;
    }
    if (Array.isArray(v)) {
      parts.push(`${key}[${v.length}]`);
      continue;
    }
    if (v && typeof v === 'object') {
      const nestedKeys = Object.keys(v as Record<string, unknown>).length;
      parts.push(`${key}{${nestedKeys}}`);
      continue;
    }
  }

  if (parts.length === 0) {
    const head = keys.slice(0, 6).join(', ');
    const tail = keys.length > 6 ? ', …' : '';
    return `{${head}${tail}}`;
  }

  const extraCount = Math.max(0, keys.length - parts.length);
  return extraCount > 0 ? `${parts.join(' ')} …` : parts.join(' ');
}

export function formatJsonPreview(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 0) return '[]';
    const headScalar = previewScalar(value[0]);
    if (headScalar !== null)
      return `[${JSON.stringify(headScalar)} …] (${len})`;
    if (value[0] && typeof value[0] === 'object') {
      const keys = Object.keys(value[0] as Record<string, unknown>).slice(0, 3);
      return `[{${keys.join(', ')}…}] (${len})`;
    }
    return `Array(${len})`;
  }

  return objectPreview(value as Record<string, unknown>);
}

export function formatTooltipValue(
  value: unknown,
  full: string,
  maxChars: number,
): string {
  if (typeof value === 'object' && value !== null) {
    try {
      const pretty = JSON.stringify(value, null, 2);
      return truncateEnd(pretty, maxChars);
    } catch {
      return truncateEnd(full, maxChars);
    }
  }
  return truncateEnd(full, maxChars);
}

export function formatValuePreview(
  value: unknown,
  opts: ValuePreviewOptions = {},
): {
  full: string;
  preview: string;
  tooltip: string | null;
  isNull: boolean;
  isTruncatedByValue: boolean;
} {
  const maxPreviewChars = opts.maxPreviewChars ?? DEFAULT_MAX_PREVIEW_CHARS;
  const maxTooltipChars = opts.maxTooltipChars ?? DEFAULT_MAX_TOOLTIP_CHARS;

  const isNull = value === null || value === undefined;
  const isJsonLike = typeof value === 'object' && value !== null;

  const full = isNull
    ? 'null'
    : typeof value === 'string'
      ? value
      : isJsonLike
        ? (() => {
            try {
              return JSON.stringify(value);
            } catch {
              return String(value);
            }
          })()
        : String(value);

  const rawPreview = isNull
    ? 'null'
    : isJsonLike
      ? formatJsonPreview(value)
      : full;
  const preview = truncateEnd(rawPreview, maxPreviewChars);
  const isTruncatedByValue = rawPreview.length > maxPreviewChars;

  const tooltip =
    isJsonLike || isTruncatedByValue
      ? formatTooltipValue(value, full, maxTooltipChars)
      : null;

  return { full, preview, tooltip, isNull, isTruncatedByValue };
}
