import type { Service, ServiceType } from "./presentation/components/service-card";

export type UrlResource =
  | { kind: "service"; service: Service }
  | { kind: "clone"; parent: Service; cloneIndex: number; name: string; urlId: number };

/** Default clone rows (names) — aligned with `ServiceTreeView.getClonesForService`. */
export function defaultCloneDescriptors(service: Service): { name: string; hasMasking: boolean }[] {
  if (service.type === "external_datasource") {
    return [{ name: "read-replica", hasMasking: false }];
  }
  if (service.type === "postgres") {
    return [
      { name: "primary", hasMasking: true },
      { name: "replica-1", hasMasking: false },
      { name: "replica-2", hasMasking: false },
      { name: "replica-3", hasMasking: false },
      { name: "replica-4", hasMasking: false },
    ];
  }
  if (service.type === "redis") {
    return [
      { name: "redis-a", hasMasking: false },
      { name: "redis-b", hasMasking: false },
    ];
  }
  return [
    { name: `${service.name}-a`, hasMasking: true },
    { name: `${service.name}-b`, hasMasking: false },
  ];
}

/** Branch slots = `cloneUrlIds.length` (topology / URL ids). */
export function stackedBranchSlotCount(service: Service): number {
  return service.cloneUrlIds?.length ?? 0;
}

export function lookupUrlResource(
  services: Service[],
  urlId: number,
  /** Flattened topology forest rows (nested clones whose ids are not on `cloneUrlIds`). */
  topologyForestRows?: readonly Service[],
): UrlResource | null {
  for (const s of services) {
    if (s.urlId === urlId) return { kind: "service", service: s };
    const ids = s.cloneUrlIds;
    if (!ids?.length) continue;
    const idx = ids.indexOf(urlId);
    if (idx >= 0) {
      const desc = defaultCloneDescriptors(s)[idx];
      return {
        kind: "clone",
        parent: s,
        cloneIndex: idx,
        name: desc?.name ?? `clone-${idx}`,
        urlId,
      };
    }
  }
  if (topologyForestRows?.length) {
    for (const row of topologyForestRows) {
      if (row.urlId !== urlId) continue;
      const root = row.topologyRoot;
      if (!root) continue;
      return {
        kind: "clone",
        parent: root,
        cloneIndex: 0,
        name: row.name,
        urlId,
      };
    }
  }
  return null;
}

export function nextAvailableUrlId(services: Service[]): number {
  let max = 0;
  for (const s of services) {
    if (s.urlId != null && s.urlId > max) max = s.urlId;
    for (const c of s.cloneUrlIds ?? []) {
      if (c > max) max = c;
    }
  }
  return max + 1;
}

export function ensureListUrlIds(list: Service[]): Service[] {
  let next = nextAvailableUrlId(list);
  return list.map((s) => {
    const urlId = s.urlId ?? next++;
    const n = stackedBranchSlotCount({ ...s, urlId, cloneUrlIds: s.cloneUrlIds });
    let cloneUrlIds = s.cloneUrlIds;
    if (n > 0) {
      cloneUrlIds = cloneUrlIds ? [...cloneUrlIds] : [];
      while (cloneUrlIds.length < n) cloneUrlIds.push(next++);
    }
    return { ...s, urlId, cloneUrlIds };
  });
}

export function cloneServicesForCanvas(parent: Service): Service[] {
  const n = stackedBranchSlotCount(parent);
  const desc = defaultCloneDescriptors(parent);
  const ids = parent.cloneUrlIds ?? [];
  const out: Service[] = [];
  for (let i = 0; i < n; i++) {
    const urlId = ids[i];
    if (urlId == null) continue;
    const d = desc[i] ?? { name: `clone-${i}`, hasMasking: false };
    out.push({
      id: `${parent.id}__clone__${i}`,
      name: d.name,
      type: parent.type as ServiceType,
      status: parent.status,
      environmentName: parent.environmentName,
      databaseProviderName: parent.databaseProviderName,
      databaseProviderLogoUrl: parent.databaseProviderLogoUrl,
      databaseVersion: parent.databaseVersion,
      nodeName: parent.nodeName,
      nodeCloudProviderLogoUrl: parent.nodeCloudProviderLogoUrl,
      urlId,
      topologyRoot: parent,
      dataMaskingEnabled: d.hasMasking,
    });
  }
  return out;
}
