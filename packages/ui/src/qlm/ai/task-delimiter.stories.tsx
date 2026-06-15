import type { Meta, StoryObj } from '@storybook/react';
import { TaskDelimiter } from './task-delimiter';
import type { ParsedTodo } from './utils/todo-logic';

const meta: Meta<typeof TaskDelimiter> = {
  title: 'Design System/AI/Task Delimiter',
  component: TaskDelimiter,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-background w-full p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TaskDelimiter>;

const todosInProgress: ParsedTodo[] = [
  {
    id: 'todo-1',
    content: 'Analyze request',
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
];

const todosCompleted: ParsedTodo[] = [
  {
    id: 'todo-1',
    content: 'Parse query',
    status: 'completed',
    priority: 'HIGH',
  },
  {
    id: 'todo-2',
    content: 'Execute query',
    status: 'completed',
    priority: 'HIGH',
  },
  {
    id: 'todo-3',
    content: 'Return results',
    status: 'completed',
    priority: 'LOW',
  },
];

const todosMixed: ParsedTodo[] = [
  {
    id: 'todo-1',
    content: 'Find datasource',
    status: 'completed',
    priority: 'HIGH',
  },
  {
    id: 'todo-2',
    content: 'Inspect schema',
    status: 'cancelled',
    priority: 'LOW',
  },
  {
    id: 'todo-3',
    content: 'Generate chart config',
    status: 'pending',
    priority: 'MEDIUM',
  },
];

export const InProgress: Story = {
  args: {
    taskIndex: 2,
    taskTitle: 'Generate SQL',
    todos: todosInProgress,
    messageId: 'msg-story-1',
  },
};

export const Completed: Story = {
  args: {
    taskIndex: 3,
    taskTitle: 'Return results',
    todos: todosCompleted,
    messageId: 'msg-story-1',
  },
};

export const MixedStatuses: Story = {
  args: {
    taskIndex: 1,
    taskTitle: 'Find datasource',
    todos: todosMixed,
    messageId: 'msg-story-1',
  },
};

export const EmptyList: Story = {
  args: {
    taskIndex: 1,
    taskTitle: 'Task',
    todos: [],
    messageId: 'msg-story-1',
  },
};
