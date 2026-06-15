import { z } from 'zod';

import type { FilterRule } from './types';

/**
 * Coerces both repeated-key (`?x=a&x=b`) and single-key (`?x=a`) URL
 * params into an array. TanStack Router can produce either shape for the
 * same logical filter value.
 */
export function arrayOf<T extends z.ZodType>(inner: T) {
  return z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    return Array.isArray(v) ? v : [v];
  }, z.array(inner).optional());
}

/** Decode a Base64(JSON) filter blob from the URL `f` param. */
export function decodeFilters(f: string | undefined): FilterRule[] | undefined {
  if (!f) return undefined;
  try {
    const json = globalThis.atob(f);
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as FilterRule[];
  } catch {
    // Malformed blob — fall through so the UI recovers to defaults.
  }
  return undefined;
}

/** Encode a FilterRule[] to a Base64(JSON) string for the URL `f` param. */
export function encodeFilters(rules: FilterRule[]): string | undefined {
  if (rules.length === 0) return undefined;
  try {
    return globalThis.btoa(JSON.stringify(rules));
  } catch {
    return undefined;
  }
}
