import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolVariantProvider } from './tool-variant-context';
import { ToolCallsGroup } from './tool-calls-group';
import { ToolPart } from './message-parts';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls Group (showcase)',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolRunQuery: AIToolUIPart = {
  type: 'tool-runQuery',
  toolCallId: 'call-runQuery-showcase-1',
  state: 'output-available',
  input: { query: 'select 1 as ok' },
  output: {
    sqlQuery: 'select 1 as ok',
    result: { columns: ['ok'], rows: [{ ok: 1 }] },
  },
};

const toolGetSchema: AIToolUIPart = {
  type: 'tool-getSchema',
  toolCallId: 'call-getSchema-showcase-1',
  state: 'output-available',
  input: { detailLevel: 'simple' },
  output: {
    detailLevel: 'simple',
    datasources: [
      {
        datasourceId: 'ds-1',
        datasourceName: 'Primary DB',
        schema: [
          {
            databaseName: 'public',
            tables: [{ tableName: 'users', columns: [{ columnName: 'id' }] }],
          },
        ],
      },
    ],
  },
};

export const Default: Story = {
  render: () => (
    <ToolVariantProvider>
      <div className="bg-background w-full p-8">
        <ToolCallsGroup toolCount={2}>
          <ToolPart part={toolRunQuery} messageId="msg-1" index={0} />
          <ToolPart part={toolGetSchema} messageId="msg-1" index={1} />
        </ToolCallsGroup>
      </div>
    </ToolVariantProvider>
  ),
};
