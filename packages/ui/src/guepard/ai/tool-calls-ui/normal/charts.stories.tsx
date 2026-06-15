import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../../message-parts';
import { SingleToolFrame } from '../_helpers';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls UI/Normal/Charts',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolSelectChartType: AIToolUIPart = {
  type: 'tool-selectChartType',
  toolCallId: 'call-selectChartType-1',
  state: 'output-available',
  input: {
    queryResults: { sqlQuery: 'select day, revenue from daily_revenue' },
  },
  output: {
    chartType: 'bar',
    reasoningText:
      'Bar chart fits discrete day buckets and compares magnitude.',
  },
};

const toolGenerateChart: AIToolUIPart = {
  type: 'tool-generateChart',
  toolCallId: 'call-generateChart-1',
  state: 'output-available',
  input: {
    queryResults: { sqlQuery: 'select day, revenue from daily_revenue' },
  },
  output: {
    chartType: 'line',
    data: [
      { day: 'Mon', revenue: 10 },
      { day: 'Tue', revenue: 18 },
      { day: 'Wed', revenue: 14 },
    ],
    config: {
      colors: ['#ffcb51'],
      labels: { day: 'Day', revenue: 'Revenue' },
      xKey: 'day',
      yKey: 'revenue',
    },
  },
};

export const SelectChartType: Story = {
  render: () => (
    <SingleToolFrame variant="default">
      <ToolPart part={toolSelectChartType} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};

export const GenerateChart: Story = {
  render: () => (
    <SingleToolFrame variant="default">
      <ToolPart part={toolGenerateChart} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
