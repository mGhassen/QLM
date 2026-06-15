import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../../message-parts';
import { SingleToolFrame } from '../_helpers';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls UI/Minimal/Schema',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolGetSchema: AIToolUIPart = {
  type: 'tool-getSchema',
  toolCallId: 'call-getSchema-1',
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
            tables: [
              {
                tableName: 'users',
                columns: [{ columnName: 'id' }, { columnName: 'email' }],
              },
              {
                tableName: 'orders',
                columns: [
                  { columnName: 'id' },
                  { columnName: 'user_id' },
                  { columnName: 'total' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

export const GetSchema: Story = {
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolGetSchema} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
