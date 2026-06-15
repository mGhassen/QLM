import { z } from 'zod';

import { NODE_PROVIDERS, type NodeProvider } from '@qlm/domain/entities';

/**
 * Discriminated union of every "virtual tab" identifier that the project
 * shell knows about. The `tid` URL search-param round-trips through
 * {@link encodeTabId} / {@link decodeTabId} so cross-app navigation never
 * leans on bare string-prefix conventions.
 *
 * Six variants today, three legacy emit paths still supported:
 *   `nc:` (node-cluster), `np:` (node-provider), `topology:*` (pool/node/attention),
 *   `node:` (node-name).
 */
export const TabIdSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('node-cluster'),
    cluster: z.string().min(1).nullable(),
  }),
  z.object({
    kind: z.literal('node-provider'),
    provider: z.enum(NODE_PROVIDERS),
  }),
  z.object({
    kind: z.literal('node-name'),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal('topology-pool'),
    provider: z.union([z.enum(NODE_PROVIDERS), z.literal('unknown')]),
    region: z.string().min(1),
    cluster: z.string().min(1).nullable(),
  }),
  z.object({
    kind: z.literal('topology-node'),
    nodeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('topology-attention'),
  }),
  z.object({
    kind: z.literal('database-name'),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal('performance-profile-name'),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal('studio-doc'),
    slug: z.string().min(1),
  }),
]);

export type TabId = z.infer<typeof TabIdSchema>;
export type TabIdKind = TabId['kind'];

const NULL_CLUSTER_TOKEN = 'unclustered';

/**
 * Encode a TabId into the canonical `kind:payload` string used as the
 * `tid` URL search param. Free-form fields (cluster, region, node name)
 * are URI-component encoded so colons in user-supplied data don't break
 * the parser.
 */
export function encodeTabId(tab: TabId): string {
  switch (tab.kind) {
    case 'node-cluster':
      return `node-cluster:${encodeURIComponent(tab.cluster ?? NULL_CLUSTER_TOKEN)}`;
    case 'node-provider':
      return `node-provider:${tab.provider}`;
    case 'node-name':
      return `node-name:${encodeURIComponent(tab.name)}`;
    case 'topology-pool': {
      const cluster = encodeURIComponent(tab.cluster ?? NULL_CLUSTER_TOKEN);
      return `topology-pool:${tab.provider}:${encodeURIComponent(tab.region)}:${cluster}`;
    }
    case 'topology-node':
      return `topology-node:${encodeURIComponent(tab.nodeId)}`;
    case 'topology-attention':
      return 'topology-attention';
    case 'database-name':
      return `database-name:${encodeURIComponent(tab.name)}`;
    case 'performance-profile-name':
      return `performance-profile-name:${encodeURIComponent(tab.name)}`;
    case 'studio-doc':
      return `studio-doc:${encodeURIComponent(tab.slug)}`;
  }
}

/**
 * Canonical tab ID for flat routes. Applies URI-component encoding so
 * special characters in the param value don't break the `kind:payload`
 * format used throughout the shell contracts.
 */
export function makeFlatTabId(prefix: string, value: string): string {
  return `${prefix}:${encodeURIComponent(value)}`;
}

/**
 * Parse a raw `tid` value into a TabId. Accepts both the canonical
 * `kind:payload` form and the legacy `nc:` / `np:` / `topology:*` /
 * `node:` prefixes. Returns null for malformed or unknown shapes — the
 * caller renders no virtual tab.
 *
 */
export function decodeTabId(raw: string): TabId | null {
  if (!raw) return null;
  if (raw === 'topology-attention' || raw === 'topology:attention') {
    return { kind: 'topology-attention' };
  }

  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return null;

  const head = raw.slice(0, colonIdx);
  const tail = raw.slice(colonIdx + 1);

  switch (head) {
    case 'node-cluster': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({
        kind: 'node-cluster',
        cluster: decoded === NULL_CLUSTER_TOKEN ? null : decoded,
      });
    }
    case 'node-provider':
      return parseTabId({ kind: 'node-provider', provider: tail });
    case 'node-name': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'node-name', name: decoded });
    }
    case 'topology-pool': {
      const parts = tail.split(':');
      if (parts.length !== 3) return null;
      const [provider, regionRaw, clusterRaw] = parts as [string, string, string];
      const region = safeDecodeURIComponent(regionRaw);
      const cluster = safeDecodeURIComponent(clusterRaw);
      if (region === null || cluster === null) return null;
      return parseTabId({
        kind: 'topology-pool',
        provider,
        region,
        cluster: cluster === NULL_CLUSTER_TOKEN ? null : cluster,
      });
    }
    case 'topology-node': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'topology-node', nodeId: decoded });
    }

    case 'database-name': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'database-name', name: decoded });
    }
    case 'performance-profile-name': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'performance-profile-name', name: decoded });
    }
    case 'studio-doc': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'studio-doc', slug: decoded });
    }

    // Legacy emit paths.
    case 'nc':
      return parseTabId({
        kind: 'node-cluster',
        cluster: tail === NULL_CLUSTER_TOKEN ? null : tail,
      });
    case 'np': {
      const decoded = safeDecodeURIComponent(tail);
      if (decoded === null) return null;
      return parseTabId({ kind: 'node-provider', provider: decoded });
    }
    case 'node':
      return parseTabId({ kind: 'node-name', name: tail });
    case 'topology': {
      const parts = tail.split(':');
      if (parts.length === 2 && parts[0] === 'node') {
        return parseTabId({ kind: 'topology-node', nodeId: parts[1] });
      }
      if (parts.length === 3) {
        const [provider, region, cluster] = parts as [string, string, string];
        return parseTabId({
          kind: 'topology-pool',
          provider,
          region,
          cluster: cluster === NULL_CLUSTER_TOKEN ? null : cluster,
        });
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Localized title for the virtual tab. `t` is a translator (typically
 * react-i18next's `t` bound to the `shell` namespace). `providers` lets
 * the caller map provider IDs to display labels (e.g. `aws → "AWS"`).
 */
export type TabTitleContext = {
  t: (key: string) => string;
  providers?: Partial<Record<NodeProvider | 'unknown', string>>;
};

export function deriveTabTitle(tab: TabId, ctx: TabTitleContext): string {
  switch (tab.kind) {
    case 'node-cluster':
      return tab.cluster ?? ctx.t('shell.tab.unclustered');
    case 'node-provider':
      return providerLabel(tab.provider, ctx);
    case 'node-name':
      return `${ctx.t('tab.app.infrastructure')} · ${tab.name}`;
    case 'topology-pool': {
      const cluster = tab.cluster ?? ctx.t('shell.tab.unclustered');
      return [providerLabel(tab.provider, ctx), tab.region, cluster]
        .filter((part): part is string => Boolean(part))
        .join(' · ');
    }
    case 'topology-node':
      return `${ctx.t('tab.app.topology')} · ${tab.nodeId}`;
    case 'topology-attention':
      return ctx.t('shell.tab.attention');
    case 'database-name':
      return `${ctx.t('tab.app.databases')} · ${tab.name}`;
    case 'performance-profile-name':
      return `${ctx.t('tab.app.performance-profiles')} · ${tab.name}`;
    case 'studio-doc':
      return tab.slug;
  }
}

function providerLabel(
  provider: NodeProvider | 'unknown',
  ctx: TabTitleContext,
): string {
  return ctx.providers?.[provider] ?? provider;
}

function parseTabId(input: unknown): TabId | null {
  const result = TabIdSchema.safeParse(input);
  return result.success ? result.data : null;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
