import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { UnifiedSelector, type UnifiedSelectorItem } from './unified-selector';

const meta: Meta<typeof UnifiedSelector> = {
  title: 'Design System/UnifiedSelector',
  component: UnifiedSelector,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof UnifiedSelector>;

type Region = UnifiedSelectorItem & {
  continent: string;
};

const REGIONS: Region[] = [
  {
    id: 'us-east-1',
    name: 'US East (N. Virginia)',
    code: 'us-east-1',
    continent: 'Americas',
    description: 'Low-latency reads for East Coast',
  },
  {
    id: 'us-east-2',
    name: 'US East (Ohio)',
    code: 'us-east-2',
    continent: 'Americas',
    description: 'Redundant East Coast region',
  },
  {
    id: 'us-west-1',
    name: 'US West (N. California)',
    code: 'us-west-1',
    continent: 'Americas',
  },
  {
    id: 'us-west-2',
    name: 'US West (Oregon)',
    code: 'us-west-2',
    continent: 'Americas',
    description: 'Primary West Coast region',
  },
  {
    id: 'ca-central-1',
    name: 'Canada (Central)',
    code: 'ca-central-1',
    continent: 'Americas',
  },
  {
    id: 'sa-east-1',
    name: 'South America (São Paulo)',
    code: 'sa-east-1',
    continent: 'Americas',
  },
  {
    id: 'eu-west-1',
    name: 'Europe (Ireland)',
    code: 'eu-west-1',
    continent: 'Europe',
    description: 'Primary EU region',
  },
  {
    id: 'eu-west-2',
    name: 'Europe (London)',
    code: 'eu-west-2',
    continent: 'Europe',
  },
  {
    id: 'eu-west-3',
    name: 'Europe (Paris)',
    code: 'eu-west-3',
    continent: 'Europe',
  },
  {
    id: 'eu-central-1',
    name: 'Europe (Frankfurt)',
    code: 'eu-central-1',
    continent: 'Europe',
  },
  {
    id: 'eu-north-1',
    name: 'Europe (Stockholm)',
    code: 'eu-north-1',
    continent: 'Europe',
  },
  {
    id: 'eu-south-1',
    name: 'Europe (Milan)',
    code: 'eu-south-1',
    continent: 'Europe',
  },
  {
    id: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    code: 'ap-southeast-1',
    continent: 'Asia Pacific',
  },
  {
    id: 'ap-southeast-2',
    name: 'Asia Pacific (Sydney)',
    code: 'ap-southeast-2',
    continent: 'Asia Pacific',
  },
  {
    id: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    code: 'ap-northeast-1',
    continent: 'Asia Pacific',
  },
  {
    id: 'ap-northeast-2',
    name: 'Asia Pacific (Seoul)',
    code: 'ap-northeast-2',
    continent: 'Asia Pacific',
  },
  {
    id: 'ap-south-1',
    name: 'Asia Pacific (Mumbai)',
    code: 'ap-south-1',
    continent: 'Asia Pacific',
  },
  {
    id: 'me-south-1',
    name: 'Middle East (Bahrain)',
    code: 'me-south-1',
    continent: 'Middle East',
  },
  {
    id: 'af-south-1',
    name: 'Africa (Cape Town)',
    code: 'af-south-1',
    continent: 'Africa',
  },
];

function SingleStory() {
  const [selectedId, setSelectedId] = useState<string | undefined>('eu-west-1');
  return (
    <div className="max-w-sm">
      <UnifiedSelector<Region>
        mode="single"
        label="Region"
        required
        items={REGIONS}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        onClearSelection={() => setSelectedId(undefined)}
      />
      <p className="text-muted-foreground mt-4 text-xs">
        Selected: <code>{selectedId ?? '(none)'}</code>
      </p>
    </div>
  );
}

export const Single: Story = {
  name: 'Single select',
  render: () => <SingleStory />,
};

function MultiStory() {
  const [ids, setIds] = useState<string[]>(['us-east-1', 'eu-west-1']);
  return (
    <div className="max-w-sm">
      <UnifiedSelector<Region>
        mode="multi"
        label="Replica regions"
        items={REGIONS}
        selectedIds={ids}
        onSelectionChange={setIds}
      />
      <p className="text-muted-foreground mt-4 text-xs">
        Selected: <code>{ids.join(', ') || '(none)'}</code>
      </p>
    </div>
  );
}

export const Multi: Story = {
  name: 'Multi select',
  render: () => <MultiStory />,
};

function WithLoadMoreStory() {
  const [count, setCount] = useState(6);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const items = REGIONS.slice(0, count);
  const onLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setCount((c) => Math.min(REGIONS.length, c + 6));
      setLoadingMore(false);
    }, 400);
  };
  return (
    <div className="max-w-sm">
      <UnifiedSelector<Region>
        mode="single"
        label="Region"
        items={items}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        hasMore={count < REGIONS.length}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
      />
      <p className="text-muted-foreground mt-4 text-xs">
        Loaded: {items.length} / {REGIONS.length}
      </p>
    </div>
  );
}

export const WithLoadMore: Story = {
  name: 'Single with load-more',
  render: () => <WithLoadMoreStory />,
};

function WithCreateAndDuplicateStory() {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [lastAction, setLastAction] = useState<string>('(none)');
  return (
    <div className="max-w-sm">
      <UnifiedSelector<Region>
        mode="single"
        label="Region"
        items={REGIONS.slice(0, 5)}
        selectedId={selectedId}
        onSelect={(item) => {
          setSelectedId(item.id);
          setLastAction(`select: ${item.id}`);
        }}
        onDuplicate={(item) => setLastAction(`duplicate: ${item.id}`)}
        onCreateNew={() => setLastAction('create-new clicked')}
      />
      <p className="text-muted-foreground mt-4 text-xs">
        Last action: <code>{lastAction}</code>
      </p>
    </div>
  );
}

export const WithCreateAndDuplicate: Story = {
  name: 'Single with create + duplicate',
  render: () => <WithCreateAndDuplicateStory />,
};

function WithManageLinkStory() {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  return (
    <div className="max-w-sm">
      <UnifiedSelector<Region>
        mode="single"
        label="Region"
        items={REGIONS}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        manageLink={{ href: '#', text: 'Manage regions' }}
      />
    </div>
  );
}

export const WithManageLink: Story = {
  name: 'Single with manage link',
  render: () => <WithManageLinkStory />,
};
