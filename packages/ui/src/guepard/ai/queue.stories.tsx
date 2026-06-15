import type { Meta, StoryObj } from '@storybook/react';
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  type QueueTodo,
} from './queue';

const meta: Meta<typeof Queue> = {
  title: 'Design System/AI/Queue',
  component: Queue,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Queue>;

function QueueCard({ open }: { open: boolean }) {
  const count = open ? 4 : 3;
  const items = open ? sampleTodos : sampleTodos.slice(0, 3);
  return (
    <div className="bg-background w-full max-w-md p-6">
      <Queue>
        <QueueSection defaultOpen={open}>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={count}
              label={open ? 'tasks' : 'queued'}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {items.map((todo) => (
                <QueueItem key={todo.id}>
                  <div className="flex items-center gap-3">
                    <QueueItemIndicator
                      completed={todo.status === 'completed'}
                    />
                    <QueueItemContent completed={todo.status === 'completed'}>
                      {todo.title}
                    </QueueItemContent>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  );
}

const sampleTodos: QueueTodo[] = [
  {
    id: '1',
    title: 'Parse query',
    status: 'completed',
  },
  {
    id: '2',
    title: 'Connect to datasource',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Execute & validate',
    status: 'pending',
  },
  { id: '4', title: 'Return results', status: 'pending' },
];

export const Default: Story = {
  render: () => <QueueCard open />,
};

export const Collapsed: Story = {
  render: () => <QueueCard open={false} />,
};
