import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../message-parts';
import { SingleToolFrame } from './_helpers';

const meta: Meta = {
  // Keep legacy title so old story IDs keep working.
  title: 'Design System/AI/Tool Calls UI',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolRunQuery: AIToolUIPart = {
  type: 'tool-runQuery',
  toolCallId: 'call-runQuery-legacy',
  state: 'output-available',
  input: { query: 'select 1 as ok' },
  output: {
    sqlQuery: 'select 1 as ok',
    result: { columns: ['ok'], rows: [{ ok: 1 }] },
  },
};

export const SingleToolMinimal: Story = {
  name: 'Minimal / Single tool (legacy id)',
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolRunQuery} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};

export const SingleToolDefault: Story = {
  name: 'Normal / Single tool (legacy id)',
  render: () => (
    <SingleToolFrame variant="default">
      <ToolPart part={toolRunQuery} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
