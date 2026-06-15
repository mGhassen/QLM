import { useMemo } from 'react';

import type { Node } from '@guepard/domain/entities';

/** Max CPU/memory across the visible set — drives HeatBar normalization. */
export function useMaxResources(rows: readonly Node[]): { maxCpu: number; maxMem: number } {
  return useMemo(() => {
    let cpu = 0;
    let mem = 0;
    for (const n of rows) {
      if (n.cpuCores > cpu) cpu = n.cpuCores;
      if (n.memoryGb > mem) mem = n.memoryGb;
    }
    return { maxCpu: cpu, maxMem: mem };
  }, [rows]);
}

/** Free-text search filter (name / id / tags, case-insensitive). */
export function filterNodesBySearch(rows: readonly Node[], query: string): Node[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows as Node[];
  return rows.filter(
    (n) =>
      n.name.toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q) ||
      n.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

/** Format an ISO date into { date, time } using the user locale. */
export function fmtDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() };
}
