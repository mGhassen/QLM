import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelector, type ModelOption } from './model-selector';
import { ModelsManagerSheet } from './models-manager-sheet';

const meta: Meta = {
  title: 'Design System/AI/Model Selector',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const ALL_MODELS: ModelOption[] = [
  { name: 'GPT-4', shortName: 'GPT-4', value: 'openai/gpt-4' },
  { name: 'GPT-4o', shortName: 'GPT-4o', value: 'openai/gpt-4o' },
  { name: 'GPT-4.1', shortName: 'GPT-4.1', value: 'openai/gpt-4.1' },
  { name: 'GPT-4.1 mini', shortName: '4.1 mini', value: 'openai/gpt-4.1-mini' },
  { name: 'o3', shortName: 'o3', value: 'openai/o3' },
  { name: 'o3 mini', shortName: 'o3 mini', value: 'openai/o3-mini' },
  {
    name: 'Claude 3 Opus',
    shortName: 'Opus',
    value: 'anthropic/claude-3-opus',
  },
  {
    name: 'Claude 3.5 Sonnet',
    shortName: 'Sonnet',
    value: 'anthropic/claude-3.5-sonnet',
  },
  {
    name: 'Claude 3.5 Haiku',
    shortName: 'Haiku',
    value: 'anthropic/claude-3.5-haiku',
  },
  { name: 'Llama 3 70B', shortName: 'Llama3 70B', value: 'ollama/llama3:70b' },
  { name: 'Llama 3 8B', shortName: 'Llama3 8B', value: 'ollama/llama3:8b' },
  { name: 'Mistral Large', shortName: 'Mistral', value: 'other/mistral-large' },
];

function makeLotsOfModels(): ModelOption[] {
  // A big list to exercise paging (10/page).
  const base = ALL_MODELS;
  const out: ModelOption[] = [];
  for (let i = 0; i < 26; i++) {
    const m = base[i % base.length]!;
    out.push({
      ...m,
      name: `${m.name} ${i + 1}`,
      shortName: m.shortName ? `${m.shortName} ${i + 1}` : undefined,
      value: `${m.value}-${i + 1}`,
    });
  }
  return out;
}

function SelectorHarness({
  allModels = ALL_MODELS,
  initialEnabledIds,
  canManageModels = true,
}: {
  allModels?: ModelOption[];
  initialEnabledIds?: string[];
  canManageModels?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [enabledModelIds, setEnabledModelIds] = React.useState<Set<string>>(
    () =>
      new Set(initialEnabledIds ?? allModels.slice(0, 6).map((m) => m.value)),
  );

  const models = React.useMemo(
    () => allModels.filter((m) => enabledModelIds.has(m.value)),
    [allModels, enabledModelIds],
  );

  const [value, setValue] = React.useState(() => models[0]?.value ?? '');

  React.useEffect(() => {
    if (!value || !models.some((m) => m.value === value)) {
      setValue(models[0]?.value ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  return (
    <div className="bg-background w-full p-8">
      <div className="flex items-center gap-3">
        <ModelSelector
          models={models}
          value={value}
          onValueChange={setValue}
          onOpenManageSheet={
            canManageModels ? () => setSheetOpen(true) : undefined
          }
        />
        <div className="text-muted-foreground text-xs">
          {models.length}/{allModels.length} enabled
        </div>
      </div>

      {canManageModels && (
        <ModelsManagerSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          allModels={allModels}
          enabledModelIds={enabledModelIds}
          onModelsChange={setEnabledModelIds}
        />
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <SelectorHarness canManageModels={false} />,
};

export const WithManageSheet: Story = {
  render: () => <SelectorHarness canManageModels />,
};

export const ManyModelsPagination: Story = {
  render: () => (
    <SelectorHarness allModels={makeLotsOfModels()} canManageModels />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="bg-background w-full p-8">
      <ModelSelector models={[]} value="" onValueChange={() => {}} />
    </div>
  ),
};

function SheetOpenStory() {
  const allModels = ALL_MODELS;
  const [enabledModelIds, setEnabledModelIds] = React.useState<Set<string>>(
    () => new Set(allModels.slice(0, 6).map((m) => m.value)),
  );

  return (
    <div className="bg-background w-full p-8">
      <ModelsManagerSheet
        open
        onOpenChange={() => {}}
        allModels={allModels}
        enabledModelIds={enabledModelIds}
        onModelsChange={setEnabledModelIds}
      />
    </div>
  );
}

export const SheetOpen: Story = {
  render: () => <SheetOpenStory />,
};
