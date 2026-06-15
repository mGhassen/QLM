import { describe, expect, it } from 'vitest';

import {
  decodeTabId,
  deriveTabTitle,
  encodeTabId,
  TabIdSchema,
  type TabId,
} from './tab-id';

const PROVIDER_LABELS = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  'on-premise': 'On-Prem',
  unknown: 'Unknown',
} as const;

const t = (key: string) =>
  ({
    'shell.tab.unclustered': 'Unclustered',
    'shell.tab.attention': 'Needs Attention',
    'tab.app.infrastructure': 'Infrastructure',
    'tab.app.topology': 'Topology',
    'tab.app.databases': 'Databases',
  })[key] ?? key;

const ROUND_TRIP_FIXTURES: { name: string; tab: TabId; canonical: string }[] = [
  {
    name: 'node-cluster with name',
    tab: { kind: 'node-cluster', cluster: 'production' },
    canonical: 'node-cluster:production',
  },
  {
    name: 'node-cluster with null',
    tab: { kind: 'node-cluster', cluster: null },
    canonical: 'node-cluster:unclustered',
  },
  {
    name: 'node-provider aws',
    tab: { kind: 'node-provider', provider: 'aws' },
    canonical: 'node-provider:aws',
  },
  {
    name: 'node-name with simple value',
    tab: { kind: 'node-name', name: 'web-1' },
    canonical: 'node-name:web-1',
  },
  {
    name: 'studio-doc slug',
    tab: { kind: 'studio-doc', slug: 'my-doc' },
    canonical: 'studio-doc:my-doc',
  },
  {
    name: 'node-name with colon-bearing value (URI-encoded)',
    tab: { kind: 'node-name', name: 'web:edge:1' },
    canonical: 'node-name:web%3Aedge%3A1',
  },
  {
    name: 'topology-pool with cluster',
    tab: {
      kind: 'topology-pool',
      provider: 'aws',
      region: 'us-east-1',
      cluster: 'default',
    },
    canonical: 'topology-pool:aws:us-east-1:default',
  },
  {
    name: 'topology-pool with null cluster',
    tab: {
      kind: 'topology-pool',
      provider: 'gcp',
      region: 'europe-west1',
      cluster: null,
    },
    canonical: 'topology-pool:gcp:europe-west1:unclustered',
  },
  {
    name: 'topology-pool with unknown provider',
    tab: {
      kind: 'topology-pool',
      provider: 'unknown',
      region: 'on-prem',
      cluster: null,
    },
    canonical: 'topology-pool:unknown:on-prem:unclustered',
  },
  {
    name: 'topology-node',
    tab: { kind: 'topology-node', nodeId: 'abc-123' },
    canonical: 'topology-node:abc-123',
  },
  {
    name: 'topology-attention',
    tab: { kind: 'topology-attention' },
    canonical: 'topology-attention',
  },
  {
    name: 'database-name',
    tab: { kind: 'database-name', name: 'pg-main' },
    canonical: 'database-name:pg-main',
  },
];

describe('TabIdSchema', () => {
  it.each(ROUND_TRIP_FIXTURES)('parses every variant: $name', ({ tab }) => {
    const result = TabIdSchema.safeParse(tab);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    expect(
      TabIdSchema.safeParse({ kind: 'not-a-tab' as unknown as 'node-name' }).success,
    ).toBe(false);
  });

  it('rejects an empty node-name', () => {
    expect(TabIdSchema.safeParse({ kind: 'node-name', name: '' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown provider', () => {
    expect(
      TabIdSchema.safeParse({
        kind: 'node-provider',
        provider: 'oracle' as unknown as 'aws',
      }).success,
    ).toBe(false);
  });
});

describe('encodeTabId / decodeTabId — canonical round trip', () => {
  it.each(ROUND_TRIP_FIXTURES)(
    'round-trips $name',
    ({ tab, canonical }) => {
      expect(encodeTabId(tab)).toBe(canonical);
      expect(decodeTabId(canonical)).toEqual(tab);
    },
  );
});

describe('decodeTabId — legacy forms', () => {
  it('accepts legacy `nc:<name>`', () => {
    expect(decodeTabId('nc:production')).toEqual({
      kind: 'node-cluster',
      cluster: 'production',
    });
  });

  it('accepts legacy `nc:unclustered`', () => {
    expect(decodeTabId('nc:unclustered')).toEqual({
      kind: 'node-cluster',
      cluster: null,
    });
  });

  it('accepts legacy `np:<provider>`', () => {
    expect(decodeTabId('np:aws')).toEqual({
      kind: 'node-provider',
      provider: 'aws',
    });
  });

  it('accepts legacy `np:<provider>` with URI encoding', () => {
    expect(decodeTabId('np:on-premise')).toEqual({
      kind: 'node-provider',
      provider: 'on-premise',
    });
  });

  it('accepts legacy `node:<name>`', () => {
    expect(decodeTabId('node:web-1')).toEqual({
      kind: 'node-name',
      name: 'web-1',
    });
  });

  it('accepts legacy `topology:attention`', () => {
    expect(decodeTabId('topology:attention')).toEqual({
      kind: 'topology-attention',
    });
  });

  it('accepts legacy `topology:node:<id>`', () => {
    expect(decodeTabId('topology:node:abc-123')).toEqual({
      kind: 'topology-node',
      nodeId: 'abc-123',
    });
  });

  it('accepts legacy `topology:<p>:<r>:<c>`', () => {
    expect(decodeTabId('topology:aws:us-east-1:default')).toEqual({
      kind: 'topology-pool',
      provider: 'aws',
      region: 'us-east-1',
      cluster: 'default',
    });
  });

  it('accepts legacy `topology:<p>:<r>:unclustered`', () => {
    expect(decodeTabId('topology:gcp:europe-west1:unclustered')).toEqual({
      kind: 'topology-pool',
      provider: 'gcp',
      region: 'europe-west1',
      cluster: null,
    });
  });
});

describe('decodeTabId — malformed input', () => {
  it('returns null on empty string', () => {
    expect(decodeTabId('')).toBeNull();
  });

  it('returns null on no-colon string that is not topology-attention', () => {
    expect(decodeTabId('garbage')).toBeNull();
  });

  it('returns null on unknown head', () => {
    expect(decodeTabId('xx:yy')).toBeNull();
  });

  it('returns null when topology-pool has wrong arity', () => {
    expect(decodeTabId('topology-pool:aws:us-east-1')).toBeNull();
  });

  it('returns null when topology-pool provider is invalid', () => {
    expect(decodeTabId('topology-pool:oracle:us-east-1:default')).toBeNull();
  });

  it('returns null on truncated payload', () => {
    expect(decodeTabId('node-cluster:')).toBeNull();
    expect(decodeTabId('node-name:')).toBeNull();
  });

  it('returns null for unfinished URI escape', () => {
    expect(decodeTabId('node-name:%E0')).toBeNull();
  });
});

describe('deriveTabTitle', () => {
  it('returns the cluster name for node-cluster', () => {
    expect(
      deriveTabTitle({ kind: 'node-cluster', cluster: 'production' }, { t }),
    ).toBe('production');
  });

  it('falls back to translated unclustered for null cluster', () => {
    expect(
      deriveTabTitle({ kind: 'node-cluster', cluster: null }, { t }),
    ).toBe('Unclustered');
  });

  it('uses provider label map for node-provider', () => {
    expect(
      deriveTabTitle(
        { kind: 'node-provider', provider: 'aws' },
        { t, providers: PROVIDER_LABELS },
      ),
    ).toBe('AWS');
  });

  it('falls back to provider id when no label provided', () => {
    expect(
      deriveTabTitle({ kind: 'node-provider', provider: 'aws' }, { t }),
    ).toBe('aws');
  });

  it('prefixes app name for node-name', () => {
    expect(deriveTabTitle({ kind: 'node-name', name: 'web-1' }, { t })).toBe(
      'Infrastructure · web-1',
    );
  });

  it('joins provider · region · cluster for topology-pool', () => {
    expect(
      deriveTabTitle(
        {
          kind: 'topology-pool',
          provider: 'aws',
          region: 'us-east-1',
          cluster: 'default',
        },
        { t, providers: PROVIDER_LABELS },
      ),
    ).toBe('AWS · us-east-1 · default');
  });

  it('renders unclustered cluster in the topology-pool title', () => {
    expect(
      deriveTabTitle(
        {
          kind: 'topology-pool',
          provider: 'gcp',
          region: 'europe-west1',
          cluster: null,
        },
        { t, providers: PROVIDER_LABELS },
      ),
    ).toBe('GCP · europe-west1 · Unclustered');
  });

  it('prefixes app name for topology-node', () => {
    expect(deriveTabTitle({ kind: 'topology-node', nodeId: 'abc' }, { t })).toBe(
      'Topology · abc',
    );
  });

  it('prefixes app name for database-name', () => {
    expect(deriveTabTitle({ kind: 'database-name', name: 'pg-main' }, { t })).toBe(
      'Databases · pg-main',
    );
  });

  it('returns the translated attention label', () => {
    expect(deriveTabTitle({ kind: 'topology-attention' }, { t })).toBe(
      'Needs Attention',
    );
  });
});
