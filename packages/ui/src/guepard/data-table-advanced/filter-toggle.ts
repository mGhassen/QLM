import type { FilterRule } from './types';

/**
 * Toggle a single value in/out of an `operator: 'in'` filter rule.
 *
 * - If no rule for `field` exists and the resulting list is empty, returns `prev` unchanged.
 * - If the resulting list is empty, removes the rule entirely.
 * - Uses `ruleId` as the stable `FilterRule.id` when creating a new rule.
 */
export function toggleInFilter(
  prev: FilterRule[],
  field: string,
  ruleId: string,
  value: string,
): FilterRule[] {
  const existing = prev.find((r) => r.field === field && r.operator === 'in');
  const current = Array.isArray(existing?.value)
    ? (existing!.value as string[])
    : [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  if (!existing && next.length === 0) return prev;
  if (!existing) {
    return [
      ...prev,
      { id: ruleId, field, operator: 'in' as const, value: next },
    ];
  }
  if (next.length === 0) return prev.filter((r) => r.id !== existing.id);
  return prev.map((r) => (r.id === existing.id ? { ...r, value: next } : r));
}
