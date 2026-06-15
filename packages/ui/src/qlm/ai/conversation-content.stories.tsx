import type { Meta, StoryObj } from '@storybook/react';
import type { ChatStatus } from 'ai';
import { UIMessage } from 'ai';
import * as React from 'react';
import { QweryConversationContent } from './conversation-content';
import { TaskUIPart } from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';

const meta: Meta<typeof QweryConversationContent> = {
  title: 'Design System/AI/Conversation Content',
  component: QweryConversationContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof QweryConversationContent>;

type PlaybackStep = {
  /** ms from mount when this snapshot applies */
  afterMs: number;
  messages: UIMessage[];
  /** Mimics useChat: submitted/streaming shows loader; undefined = idle / response done */
  status?: ChatStatus;
};

/** Brief pause after choosing a story so the canvas doesn’t jump instantly. */
const SCENARIO_VIEW_DELAY_MS = 450;

function ScenarioViewDelay({
  children,
  delayMs = SCENARIO_VIEW_DELAY_MS,
}: {
  children: React.ReactNode;
  delayMs?: number;
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  if (!show) {
    return (
      <div
        className="bg-muted/40 min-h-[14rem] w-full rounded-none"
        aria-hidden
      />
    );
  }

  return <>{children}</>;
}

function ConversationPlayback({ steps }: { steps: PlaybackStep[] }) {
  const first = steps[0];
  const [messages, setMessages] = React.useState<UIMessage[]>(
    first?.messages ?? [],
  );
  const [playbackStatus, setPlaybackStatus] = React.useState<
    ChatStatus | undefined
  >(first?.status);
  const fullMessagesRef = React.useRef<UIMessage[]>(first?.messages ?? []);

  React.useEffect(() => {
    let mounted = true;
    const timers: number[] = [];

    const step0 = steps[0];
    if (step0) {
      setMessages(step0.messages);
      setPlaybackStatus(step0.status);
      fullMessagesRef.current = step0.messages;
    }

    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      const t = window.setTimeout(() => {
        if (!mounted) return;
        setMessages(step.messages);
        setPlaybackStatus(step.status);
        fullMessagesRef.current = step.messages;
      }, step.afterMs);
      timers.push(t);
    }

    return () => {
      mounted = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [steps]);

  React.useEffect(() => {
    if (playbackStatus !== 'streaming') return;

    const full = fullMessagesRef.current;
    const last = full.at(-1);
    if (!last || last.role !== 'assistant') return;

    const assistantIndex = full.length - 1;
    const totalChars = last.parts.reduce((acc, p) => {
      if (p.type === 'text' || p.type === 'reasoning')
        return acc + p.text.length;
      return acc;
    }, 0);
    if (totalChars === 0) return;

    let mounted = true;
    const start = performance.now();

    const buildPartsWithBudget = (
      parts: UIMessage['parts'],
      budget: number,
    ): UIMessage['parts'] => {
      let remaining = budget;
      return parts.map((p) => {
        if (p.type !== 'text' && p.type !== 'reasoning') return p;
        const take = Math.max(0, Math.min(p.text.length, remaining));
        remaining -= take;
        return { ...p, text: p.text.slice(0, take) };
      });
    };

    const tick = () => {
      if (!mounted) return;
      const elapsed = performance.now() - start;
      // ~1.7s total for a typical assistant response
      const budget = Math.min(
        totalChars,
        Math.floor((elapsed / 1700) * totalChars),
      );

      const nextLast: UIMessage = {
        ...last,
        parts: buildPartsWithBudget(last.parts, budget),
      };

      setMessages(() => {
        const base = full.slice(0, assistantIndex);
        return [...base, nextLast];
      });

      const done = budget >= totalChars;

      if (!done) {
        requestAnimationFrame(tick);
        return;
      }

      setMessages(full);
      setPlaybackStatus(undefined);
    };

    requestAnimationFrame(tick);
    return () => {
      mounted = false;
    };
  }, [playbackStatus]);

  return (
    <div className="w-full">
      <QweryConversationContent
        messages={messages}
        status={playbackStatus}
        onRegenerate={() => console.log('Regenerate')}
      />
    </div>
  );
}

const messageUserQuestion: UIMessage = {
  id: 'msg-user-1',
  role: 'user',
  parts: [{ type: 'text', text: 'Can you help me analyze some data?' }],
};

const messageAssistantText: UIMessage = {
  id: 'msg-assistant-text-1',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: [
        'Sure. Tell me what the dataset looks like and what you want to measure.',
        '',
        'Example:',
        '',
        '```sql',
        "select date_trunc('day', created_at) as day, count(*) as signups",
        'from users',
        'group by 1',
        'order by 1 desc',
        'limit 7;',
        '```',
        '',
        '- **Goal**: do you want trend, segmentation, or attribution?',
      ].join('\n'),
    },
  ],
};

const messageAssistantTasks: UIMessage = {
  id: 'msg-assistant-tasks-1',
  role: 'assistant',
  parts: [
    {
      type: 'data-tasks',
      id: 'task-1',
      data: {
        title: 'Data Analysis',
        tasks: [
          { id: 't1', label: 'Load data', status: 'completed' },
          { id: 't2', label: 'Process data', status: 'in-progress' },
          { id: 't3', label: 'Generate report', status: 'pending' },
        ],
      },
    } as TaskUIPart,
  ],
};

const messageAssistantReasoningAndText: UIMessage = {
  id: 'msg-assistant-reasoning-1',
  role: 'assistant',
  parts: [
    {
      type: 'reasoning',
      text: 'Let me think about the best approach to analyze this data...',
    },
    {
      type: 'text',
      text: [
        'I’ll start with a quick sanity pass:',
        '',
        '- schema + null rates',
        '- basic distributions',
        '- time ranges and outliers',
      ].join('\n'),
    },
  ],
};

const messageAssistantToolCall: UIMessage = {
  id: 'msg-assistant-tool-1',
  role: 'assistant',
  parts: [
    {
      type: 'tool-analyze_data',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { dataset: 'sample.csv' },
      output: { mean: 42.5, std: 12.3 },
    } as AIToolUIPart,
  ],
};

const messageUserFollowup: UIMessage = {
  id: 'msg-user-2',
  role: 'user',
  parts: [{ type: 'text', text: 'What are the results?' }],
};

const messageAssistantSourcesAndText: UIMessage = {
  id: 'msg-assistant-sources-1',
  role: 'assistant',
  parts: [
    {
      type: 'source-url',
      sourceId: 'source-1',
      url: 'https://example.com/data-source',
    },
    {
      type: 'text',
      text: 'The analysis shows a mean of 42.5 with a standard deviation of 12.3.',
    },
  ],
};

const introTextPart = messageAssistantText.parts[0]!;
const tasksPart = messageAssistantTasks.parts[0]!;
const toolPart = messageAssistantToolCall.parts[0]!;
const sourcePart = messageAssistantSourcesAndText.parts[0]!;
const resultsTextPart = messageAssistantSourcesAndText.parts[1]!;

/** Single assistant message: staged parts (same id = one bubble growing like a real turn). */
const ASST_TEXT_ONLY = 'msg-asst-md';
const ASST_TOOL_FLOW = 'msg-asst-tool-flow';
const ASST_TASKS_FLOW = 'msg-asst-tasks-flow';
const ASST_SOURCES_FLOW = 'msg-asst-sources-flow';
const ASST_FULL_TURN = 'msg-asst-full-turn';
const ASST_FINAL = 'msg-asst-final';

const assistantTextOnly = (parts: UIMessage['parts']): UIMessage => ({
  id: ASST_TEXT_ONLY,
  role: 'assistant',
  parts,
});

const reasoningPart = messageAssistantReasoningAndText.parts[0]!;
const reasoningBodyPart = messageAssistantReasoningAndText.parts[1]!;

// —— Prebuilt scenarios (final state) for Loading / reference ——

const scenarioTextOnly: UIMessage[] = [
  messageUserQuestion,
  assistantTextOnly([introTextPart]),
];

const scenarioToolCall: UIMessage[] = [
  messageUserQuestion,
  {
    id: ASST_TOOL_FLOW,
    role: 'assistant',
    parts: [reasoningPart, reasoningBodyPart, toolPart],
  },
];

const scenarioTasksAndToolCalls: UIMessage[] = [
  messageUserQuestion,
  {
    id: ASST_TASKS_FLOW,
    role: 'assistant',
    parts: [introTextPart, tasksPart, toolPart, sourcePart, resultsTextPart],
  },
];

const scenarioSourcesAndReasoning: UIMessage[] = [
  messageUserQuestion,
  {
    id: ASST_SOURCES_FLOW,
    role: 'assistant',
    parts: [reasoningPart, reasoningBodyPart, sourcePart, resultsTextPart],
  },
];

const scenarioFull: UIMessage[] = [
  messageUserQuestion,
  {
    id: ASST_FULL_TURN,
    role: 'assistant',
    parts: [
      introTextPart,
      tasksPart,
      reasoningPart,
      reasoningBodyPart,
      toolPart,
    ],
  },
  messageUserFollowup,
  {
    id: ASST_FINAL,
    role: 'assistant',
    parts: [sourcePart, resultsTextPart],
  },
];

const fullFirstAssistant = scenarioFull[1]!;
const fullUserFollow = scenarioFull[2]!;

const scenarioEmptyState: UIMessage[] = [
  {
    id: 'msg-empty-state',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Start a conversation by asking a question.',
      },
    ],
  },
];

function wrap(messages: UIMessage[], status?: ChatStatus) {
  return (
    <div className="w-full">
      <QweryConversationContent
        messages={messages}
        status={status}
        onRegenerate={() => console.log('Regenerate')}
      />
    </div>
  );
}

export const TextOutput: Story = {
  name: 'Text output (agent response)',
  render: () => (
    <ScenarioViewDelay>
      <ConversationPlayback
        steps={[
          { afterMs: 0, messages: [messageUserQuestion], status: undefined },
          {
            afterMs: 550,
            messages: [messageUserQuestion],
            status: 'submitted',
          },
          {
            afterMs: 1650,
            messages: scenarioTextOnly,
            status: 'streaming',
          },
        ]}
      />
    </ScenarioViewDelay>
  ),
};

export const ToolCall: Story = {
  name: 'Tool call (single)',
  render: () => (
    <ScenarioViewDelay>
      <ConversationPlayback
        steps={[
          { afterMs: 0, messages: [messageUserQuestion], status: undefined },
          {
            afterMs: 550,
            messages: [messageUserQuestion],
            status: 'submitted',
          },
          {
            afterMs: 1600,
            messages: [
              messageUserQuestion,
              { id: ASST_TOOL_FLOW, role: 'assistant', parts: [reasoningPart] },
            ],
            status: 'streaming',
          },
          {
            afterMs: 2900,
            messages: [
              messageUserQuestion,
              {
                id: ASST_TOOL_FLOW,
                role: 'assistant',
                parts: [reasoningPart, reasoningBodyPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 4200,
            messages: scenarioToolCall,
            status: 'streaming',
          },
        ]}
      />
    </ScenarioViewDelay>
  ),
};

export const TasksAndToolCalls: Story = {
  name: 'Tasks + tool calls',
  render: () => (
    <ScenarioViewDelay>
      <ConversationPlayback
        steps={[
          { afterMs: 0, messages: [messageUserQuestion], status: undefined },
          {
            afterMs: 550,
            messages: [messageUserQuestion],
            status: 'submitted',
          },
          {
            afterMs: 1400,
            messages: [
              messageUserQuestion,
              {
                id: ASST_TASKS_FLOW,
                role: 'assistant',
                parts: [introTextPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 2300,
            messages: [
              messageUserQuestion,
              {
                id: ASST_TASKS_FLOW,
                role: 'assistant',
                parts: [introTextPart, tasksPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 3400,
            messages: [
              messageUserQuestion,
              {
                id: ASST_TASKS_FLOW,
                role: 'assistant',
                parts: [introTextPart, tasksPart, toolPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 4800,
            messages: scenarioTasksAndToolCalls,
            status: 'streaming',
          },
        ]}
      />
    </ScenarioViewDelay>
  ),
};

export const SourcesAndReasoning: Story = {
  name: 'Sources + reasoning',
  render: () => (
    <ScenarioViewDelay>
      <ConversationPlayback
        steps={[
          { afterMs: 0, messages: [messageUserQuestion], status: undefined },
          {
            afterMs: 550,
            messages: [messageUserQuestion],
            status: 'submitted',
          },
          {
            afterMs: 1500,
            messages: [
              messageUserQuestion,
              {
                id: ASST_SOURCES_FLOW,
                role: 'assistant',
                parts: [reasoningPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 2800,
            messages: [
              messageUserQuestion,
              {
                id: ASST_SOURCES_FLOW,
                role: 'assistant',
                parts: [reasoningPart, reasoningBodyPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 4200,
            messages: scenarioSourcesAndReasoning,
            status: 'streaming',
          },
        ]}
      />
    </ScenarioViewDelay>
  ),
};

export const FullConversation: Story = {
  name: 'Full (tasks + tool + sources)',
  render: () => (
    <ScenarioViewDelay>
      <ConversationPlayback
        steps={[
          { afterMs: 0, messages: [messageUserQuestion], status: undefined },
          {
            afterMs: 550,
            messages: [messageUserQuestion],
            status: 'submitted',
          },
          {
            afterMs: 1300,
            messages: [
              messageUserQuestion,
              { id: ASST_FULL_TURN, role: 'assistant', parts: [introTextPart] },
            ],
            status: 'streaming',
          },
          {
            afterMs: 2200,
            messages: [
              messageUserQuestion,
              {
                id: ASST_FULL_TURN,
                role: 'assistant',
                parts: [introTextPart, tasksPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 3400,
            messages: [
              messageUserQuestion,
              {
                id: ASST_FULL_TURN,
                role: 'assistant',
                parts: [introTextPart, tasksPart, reasoningPart],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 4700,
            messages: [
              messageUserQuestion,
              {
                id: ASST_FULL_TURN,
                role: 'assistant',
                parts: [
                  introTextPart,
                  tasksPart,
                  reasoningPart,
                  reasoningBodyPart,
                ],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 6000,
            messages: [
              messageUserQuestion,
              {
                id: ASST_FULL_TURN,
                role: 'assistant',
                parts: [
                  introTextPart,
                  tasksPart,
                  reasoningPart,
                  reasoningBodyPart,
                  toolPart,
                ],
              },
            ],
            status: 'streaming',
          },
          {
            afterMs: 7200,
            messages: [messageUserQuestion, fullFirstAssistant, fullUserFollow],
            status: 'submitted',
          },
          {
            afterMs: 8800,
            messages: scenarioFull,
            status: 'streaming',
          },
        ]}
      />
    </ScenarioViewDelay>
  ),
};

export const Loading: Story = {
  name: 'Loading (submitted)',
  render: () => (
    <ScenarioViewDelay>{wrap(scenarioFull, 'submitted')}</ScenarioViewDelay>
  ),
};

export const EmptyState: Story = {
  name: 'Empty state (no history)',
  render: () => (
    <ScenarioViewDelay>{wrap(scenarioEmptyState)}</ScenarioViewDelay>
  ),
};
