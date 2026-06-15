import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import type { UIMessage } from 'ai';
import type { PromptInputMessage } from '../../ai-elements/prompt-input';

import { QweryConversationContent } from './conversation-content';
import QweryPromptInput from './prompt-input';

import type { ToolUIPart as AIToolUIPart } from 'ai';

const meta: Meta = {
  title: 'Design System/AI/Chat (tools + minimal toggle)',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function createAssistantToolResponse(userText: string): UIMessage {
  const todos = [
    {
      id: 'todo-1',
      content: 'Parse request',
      status: 'completed',
      priority: 'HIGH',
    },
    {
      id: 'todo-2',
      content: 'Generate SQL',
      status: 'in_progress',
      priority: 'HIGH',
    },
    {
      id: 'todo-3',
      content: 'Run query',
      status: 'pending',
      priority: 'MEDIUM',
    },
    {
      id: 'todo-4',
      content: 'Explain results',
      status: 'pending',
      priority: 'LOW',
    },
  ];

  const toolRunQuery: AIToolUIPart = {
    type: 'tool-runQuery',
    toolCallId: nextId('call-runQuery'),
    state: 'output-available',
    input: { query: 'select day, revenue from daily_revenue order by day' },
    output: {
      sqlQuery: 'select day, revenue from daily_revenue order by day',
      result: {
        columns: ['day', 'revenue'],
        rows: [
          { day: 'Mon', revenue: 10 },
          { day: 'Tue', revenue: 18 },
          { day: 'Wed', revenue: 14 },
        ],
      },
    },
  };

  const toolGetSchema: AIToolUIPart = {
    type: 'tool-getSchema',
    toolCallId: nextId('call-getSchema'),
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
                  tableName: 'daily_revenue',
                  columns: [{ columnName: 'day' }, { columnName: 'revenue' }],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return {
    id: nextId('msg-assistant'),
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: `Got it. I’ll fetch the schema, run a query, then summarize.\n\nUser asked: “${userText}”`,
      },
      {
        type: 'tool-todowrite',
        toolCallId: nextId('call-todowrite'),
        state: 'output-available',
        input: { todos },
        output: undefined,
      } as unknown as AIToolUIPart,
      toolGetSchema,
      toolRunQuery,
      {
        type: 'text',
        text: 'Done. Toggle **Minimal Tool UI** in the input options to see tool calls switch rendering.',
      },
    ],
  };
}

function ChatPlayground() {
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState('gpt-4');

  const allModels = React.useMemo(
    () => [
      { name: 'GPT-4', value: 'gpt-4' },
      { name: 'GPT-4o', value: 'gpt-4o' },
      { name: 'Claude', value: 'claude' },
      { name: 'Claude Sonnet', value: 'claude-sonnet' },
    ],
    [],
  );

  const [enabledModels, setEnabledModels] = React.useState(
    () => new Set<string>(['gpt-4', 'claude']),
  );

  const models = React.useMemo(
    () => allModels.filter((m) => enabledModels.has(m.value)),
    [allModels, enabledModels],
  );

  const [messages, setMessages] = React.useState<UIMessage[]>(() => [
    {
      id: nextId('msg-user'),
      role: 'user',
      parts: [{ type: 'text', text: 'Show me revenue by day.' }],
    },
    createAssistantToolResponse('Show me revenue by day.'),
  ]);

  const onSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim() ?? '';
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: nextId('msg-user'),
        role: 'user',
        parts: [{ type: 'text', text }],
      },
      createAssistantToolResponse(text),
    ]);
    setInput('');
  };

  return (
    <div className="bg-background flex h-screen w-full flex-col">
      <div className="min-h-0 flex-1">
        <QweryConversationContent messages={messages} status={undefined} />
      </div>

      <div className="border-border/50 bg-background/80 sticky bottom-0 w-full border-t p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <QweryPromptInput
            onSubmit={onSubmit}
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
      </div>
    </div>
  );
}

export const Playground: Story = {
  render: () => <ChatPlayground />,
};
