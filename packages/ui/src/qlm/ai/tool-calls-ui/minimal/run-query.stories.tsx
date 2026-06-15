import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../../message-parts';
import { SingleToolFrame } from '../_helpers';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls UI/Minimal/Run Query',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolRunQuery: AIToolUIPart = {
  type: 'tool-runQuery',
  toolCallId: 'call-runQuery-1',
  state: 'output-available',
  input: { query: 'select 1 as ok' },
  output: {
    sqlQuery: 'select 1 as ok',
    result: { columns: ['ok'], rows: [{ ok: 1 }] },
  },
};

const toolRunQueries: AIToolUIPart = {
  type: 'tool-runQueries',
  toolCallId: 'call-runQueries-1',
  state: 'output-available',
  input: {
    queries: [
      { id: 'q1', query: 'select count(*) from users' },
      { id: 'q2', query: 'select now()' },
    ],
  },
  output: {
    results: [
      {
        id: 'q1',
        query: 'select count(*) from users',
        success: true,
        data: { result: { columns: ['count'], rows: [{ count: 42 }] } },
      },
      {
        id: 'q2',
        query: 'select now()',
        success: true,
        data: {
          result: { columns: ['now'], rows: [{ now: '2026-04-08T12:00:00Z' }] },
        },
      },
    ],
    meta: { total: 2, succeeded: 2, failed: 0, durationMs: 1432 },
  },
};

export const RunQuery: Story = {
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolRunQuery} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};

export const RunQueries: Story = {
  render: () => (
    <SingleToolFrame variant="minimal">
      <ToolPart part={toolRunQueries} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
