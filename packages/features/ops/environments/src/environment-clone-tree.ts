import type { Service, ServiceType } from "./presentation/components/service-card";
import { cloneServicesForCanvas } from "./environment-url-registry";

export type CloneForestNode = {
  treeId: string;
  rowService: Service;
  children: CloneForestNode[];
};

let mockTreeSeq = 0;
function nextTreeId() {
  mockTreeSeq += 1;
  return `cf-${mockTreeSeq}`;
}

export function buildServiceRowForFork(
  parent: Service,
  name: string,
  urlId: number,
  dataMaskingEnabled = false,
): Service {
  return {
    id: `${parent.id}__fork__${urlId}`,
    name,
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
    dataMaskingEnabled,
  };
}

export function forestMaxUrlId(roots: CloneForestNode[], parent: Service): number {
  let m = Math.max(0, ...(parent.cloneUrlIds ?? []));
  const walk = (nodes: CloneForestNode[]) => {
    for (const n of nodes) {
      m = Math.max(m, n.rowService.urlId ?? 0);
      walk(n.children);
    }
  };
  walk(roots);
  return m;
}

export function initialCloneForest(parent: Service): CloneForestNode[] {
  const base = cloneServicesForCanvas(parent);
  const roots: CloneForestNode[] = base.map((row) => ({
    treeId: nextTreeId(),
    rowService: row,
    children: [],
  }));
  if (roots.length > 1) {
    let nextUrl = forestMaxUrlId(roots, parent) + 1;
    const forkRow = buildServiceRowForFork(
      parent,
      `${roots[1]!.rowService.name}/branch`,
      nextUrl++,
      false,
    );
    const deepRow = buildServiceRowForFork(
      parent,
      `${forkRow.name}/leaf`,
      nextUrl++,
      false,
    );
    const forkNode: CloneForestNode = {
      treeId: nextTreeId(),
      rowService: forkRow,
      children: [
        {
          treeId: nextTreeId(),
          rowService: deepRow,
          children: [],
        },
      ],
    };
    roots[1] = {
      ...roots[1]!,
      children: [forkNode],
    };
  }
  if (roots.length > 2) {
    const nextUrl = forestMaxUrlId(roots, parent) + 1;
    roots[2] = {
      ...roots[2]!,
      children: [
        {
          treeId: nextTreeId(),
          rowService: buildServiceRowForFork(
            parent,
            `${roots[2]!.rowService.name}/branch`,
            nextUrl,
            false,
          ),
          children: [],
        },
      ],
    };
  }
  return roots;
}

export function cloneForestMaxBreadth(roots: CloneForestNode[]): number {
  if (!roots.length) return 1;
  let max = roots.length;
  for (const r of roots) {
    if (r.children.length) {
      max = Math.max(max, r.children.length);
      max = Math.max(max, cloneForestMaxBreadth(r.children));
    }
  }
  return max;
}

export function flattenCloneForest(roots: CloneForestNode[]): Service[] {
  const out: Service[] = [];
  const walk = (nodes: CloneForestNode[]) => {
    for (const n of nodes) {
      out.push(n.rowService);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

export function findTreeIdByRowServiceId(
  roots: CloneForestNode[],
  rowServiceId: string,
): string | null {
  for (const n of roots) {
    if (n.rowService.id === rowServiceId) return n.treeId;
    const inner = findTreeIdByRowServiceId(n.children, rowServiceId);
    if (inner) return inner;
  }
  return null;
}

export function findCloneForestNodeByTreeId(
  roots: CloneForestNode[],
  treeId: string,
): CloneForestNode | null {
  for (const n of roots) {
    if (n.treeId === treeId) return n;
    const inner = findCloneForestNodeByTreeId(n.children, treeId);
    if (inner) return inner;
  }
  return null;
}

/** `node.treeId` and every descendant — used to fully expand a collapsed branch. */
export function collectCloneForestSubtreeTreeIds(
  node: CloneForestNode,
): string[] {
  const out = [node.treeId];
  for (const ch of node.children) {
    out.push(...collectCloneForestSubtreeTreeIds(ch));
  }
  return out;
}

export function appendChildCloneUnderTreeId(
  roots: CloneForestNode[],
  targetTreeId: string,
  parentSvc: Service,
): CloneForestNode[] {
  const url = forestMaxUrlId(roots, parentSvc) + 1;
  const mapNodes = (nodes: CloneForestNode[]): CloneForestNode[] =>
    nodes.map((n) => {
      if (n.treeId === targetTreeId) {
        const idx = n.children.length + 1;
        const name = `${n.rowService.name}-fork-${idx}`;
        return {
          ...n,
          children: [
            ...n.children,
            {
              treeId: nextTreeId(),
              rowService: buildServiceRowForFork(parentSvc, name, url, false),
              children: [],
            },
          ],
        };
      }
      if (n.children.length) {
        return { ...n, children: mapNodes(n.children) };
      }
      return n;
    });
  return mapNodes(roots);
}

export function appendRootCloneSibling(
  roots: CloneForestNode[],
  parentSvc: Service,
): CloneForestNode[] {
  const url = forestMaxUrlId(roots, parentSvc) + 1;
  const idx = roots.length + 1;
  return [
    ...roots,
    {
      treeId: nextTreeId(),
      rowService: buildServiceRowForFork(parentSvc, `clone-${idx}`, url, false),
      children: [],
    },
  ];
}

function immArrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it as T);
  return next;
}

/**
 * Reorders among siblings when `activeId` / `overId` share the same parent in the forest.
 * Returns a new tree, or `null` if the ids are not siblings (no-op).
 */
export function reorderCloneForestSiblings(
  roots: CloneForestNode[],
  activeId: string,
  overId: string,
): CloneForestNode[] | null {
  if (activeId === overId) return roots;

  const tryReorder = (siblings: CloneForestNode[]): CloneForestNode[] | null => {
    const ai = siblings.findIndex((x) => x.treeId === activeId);
    const oi = siblings.findIndex((x) => x.treeId === overId);
    if (ai < 0 || oi < 0) return null;
    return immArrayMove(siblings, ai, oi);
  };

  const atRoot = tryReorder(roots);
  if (atRoot) return atRoot;

  for (let i = 0; i < roots.length; i++) {
    const node = roots[i]!;
    const nested = reorderCloneForestSiblings(node.children, activeId, overId);
    if (nested) {
      const copy = [...roots];
      copy[i] = { ...node, children: nested };
      return copy;
    }
  }
  return null;
}
