import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../../message-parts';
import { SingleToolFrame } from '../_helpers';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls UI/Minimal/Other',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolApiCallError: AIToolUIPart = {
  type: 'tool-api_call',
  toolCallId: 'call-api-1',
  state: 'output-error',
  input: { endpoint: '/api/users' },
  output: undefined,
  errorText: 'Failed to connect to API: timeout',
};

const toolGenerateSql: AIToolUIPart = {
  type: 'tool-generateSql',
  toolCallId: 'call-generateSql-1',
  state: 'output-available',
  input: { instruction: 'Find top 10 customers by revenue' },
  output: {
    query:
      'select customer_id, sum(revenue) as revenue from orders group by 1 order by 2 desc limit 10',
  },
};

export const ApiCallError: Story = {
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolApiCallError} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};

export const GenerateSql: Story = {
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolGenerateSql} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
