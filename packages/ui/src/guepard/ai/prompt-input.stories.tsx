import { useState } from 'react';
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { PromptInputMessage } from '../../ai-elements/prompt-input';
import QweryPromptInput from './prompt-input';
import type { DatasourceItem } from './datasource-selector';

const meta: Meta<typeof QweryPromptInput> = {
  title: 'Design System/AI/Prompt Input',
  component: QweryPromptInput,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QweryPromptInput>;

const mockDatasources: DatasourceItem[] = [
  {
    id: 'ds-1',
    name: 'PostgreSQL Database',
    slug: 'postgres-db',
    datasource_provider: 'postgresql',
  },
  {
    id: 'ds-2',
    name: 'MySQL Database',
    slug: 'mysql-db',
    datasource_provider: 'mysql',
  },
  {
    id: 'ds-3',
    name: 'SQLite Database',
    slug: 'sqlite-db',
    datasource_provider: 'sqlite',
  },
];

const mockPluginLogoMap = new Map<string, string>([
  ['postgresql', '/images/datasources/postgresql_icon.png'],
  ['mysql', '/images/datasources/mysql_icon.png'],
  ['sqlite', '/images/datasources/sqlite_icon.png'],
]);

const DefaultComponent = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gpt-4');

  const allModels = [
    { name: 'GPT-4', value: 'gpt-4' },
    { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
    { name: 'Claude 3', value: 'claude-3-opus' },
    { name: 'Claude Sonnet', value: 'claude-3-sonnet' },
  ];

  const [enabledModels, setEnabledModels] = useState(
    () => new Set<string>(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus']),
  );

  const models = allModels.filter((m) => enabledModels.has(m.value));

  const handleSubmit = (message: PromptInputMessage) => {
    console.log('Submitted message:', message);
    setInput('');
  };

  return (
    <div className="bg-background w-full p-8">
      <QweryPromptInput
        onSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        model={model}
        setModel={setModel}
        models={models}
        allModels={allModels}
        onModelsChange={(next) => {
          setEnabledModels(new Set(next.map((m) => m.value)));
          if (next.length > 0 && !next.some((m) => m.value === model)) {
            setModel(next[0]!.value);
          }
        }}
        status={undefined}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};

const WithDatasourcesComponent = () => {
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState('gpt-4');
  const [selectedDatasources, setSelectedDatasources] = React.useState<
    string[]
  >(['ds-1']);

  const allModels = [
    { name: 'GPT-4', value: 'gpt-4' },
    { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
    { name: 'Claude 3', value: 'claude-3-opus' },
    { name: 'Claude Sonnet', value: 'claude-3-sonnet' },
  ];

  const [enabledModels, setEnabledModels] = React.useState(
    () => new Set<string>(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus']),
  );

  const models = allModels.filter((m) => enabledModels.has(m.value));

  const handleSubmit = (message: PromptInputMessage) => {
    console.log('Submitted message:', message);
    console.log('Selected datasources:', selectedDatasources);
    setInput('');
  };

  return (
    <div className="bg-background w-full p-8">
      <QweryPromptInput
        onSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        model={model}
        setModel={setModel}
        models={models}
        allModels={allModels}
        onModelsChange={(next) => {
          setEnabledModels(new Set(next.map((m) => m.value)));
          if (next.length > 0 && !next.some((m) => m.value === model)) {
            setModel(next[0]!.value);
          }
        }}
        status={undefined}
        datasources={mockDatasources}
        selectedDatasources={selectedDatasources}
        onDatasourceSelectionChange={setSelectedDatasources}
        pluginLogoMap={mockPluginLogoMap}
      />
    </div>
  );
};

export const WithDatasources: Story = {
  render: () => <WithDatasourcesComponent />,
};
