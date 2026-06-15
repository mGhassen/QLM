import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolPart } from '../../message-parts';
import { SingleToolFrame } from '../_helpers';

const meta: Meta = {
  title: 'Design System/AI/Tool Calls UI/Normal/Web',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const toolWebfetch: AIToolUIPart = {
  type: 'tool-webfetch',
  toolCallId: 'call-webfetch-1',
  state: 'output-available',
  input: {
    url: 'https://www.google.com/search?q=postgres+index+best+practices',
    format: 'html',
  },
  output: undefined,
};

export const WebSearch: Story = {
  render: () => (
    <SingleToolFrame variant="default">
      <ToolPart part={toolWebfetch} messageId="msg-1" index={0} />
    </SingleToolFrame>
  ),
};
