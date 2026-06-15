import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConversationHistory, type Conversation } from './conversation-history';

const meta: Meta<typeof ConversationHistory> = {
  title: 'Design System/AI/Conversation history',
  component: ConversationHistory,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConversationHistory>;

const generateMockConversations = (): Conversation[] => {
  const now = new Date();
  const conversations: Conversation[] = [
    // Today
    {
      id: '1',
      slug: 'slug-1',
      title: 'Refactor agent-ui component into multiple parts',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    // Yesterday
    {
      id: '2',
      slug: 'slug-2',
      title: 'Simplify ai sdk stream implementation',
      createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
      updatedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
    },
    {
      id: '3',
      slug: 'slug-3',
      title: 'Create a unique story for prompt input',
      createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    },
    {
      id: '4',
      slug: 'slug-4',
      title: 'Streaming messages in express js',
      createdAt: new Date(now.getTime() - 27 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 27 * 60 * 60 * 1000),
    },
    {
      id: '5',
      slug: 'slug-5',
      title: 'Add hello world handler to conversation API',
      createdAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
    },
    {
      id: '6',
      slug: 'slug-6',
      title: 'Improve typescript type definitions',
      createdAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
    },
    {
      id: '7',
      slug: 'slug-7',
      title: 'Implement hello world websocket',
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    },
    {
      id: '8',
      slug: 'slug-8',
      title: 'Using azure openai in the browser',
      createdAt: new Date(now.getTime() - 31 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 31 * 60 * 60 * 1000),
    },
    {
      id: '9',
      slug: 'slug-9',
      title: 'Add support for web-llm package',
      createdAt: new Date(now.getTime() - 32 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 32 * 60 * 60 * 1000),
    },
    {
      id: '10',
      slug: 'slug-10',
      title: 'Implement ai agent framework with best practices',
      createdAt: new Date(now.getTime() - 33 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 33 * 60 * 60 * 1000),
    },
    {
      id: '11',
      slug: 'slug-11',
      title: 'Fix TypeScript object literal error',
      createdAt: new Date(now.getTime() - 34 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 34 * 60 * 60 * 1000),
    },
    {
      id: '12',
      slug: 'slug-12',
      title: 'Update state machine for intent clarification',
      createdAt: new Date(now.getTime() - 35 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 35 * 60 * 60 * 1000),
    },
    // 2 days ago
    {
      id: '13',
      slug: 'slug-13',
      title: 'Understand intent by fetching context',
      createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000), // 50 hours ago
      updatedAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
    },
    {
      id: '14',
      slug: 'slug-14',
      title: 'Update state machine for intent clarification',
      createdAt: new Date(now.getTime() - 51 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 51 * 60 * 60 * 1000),
    },
    {
      id: '15',
      slug: 'slug-15',
      title: 'Update state machine in test file',
      createdAt: new Date(now.getTime() - 52 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 52 * 60 * 60 * 1000),
    },
  ];

  return conversations;
};

const DefaultComponent = () => {
  const [currentConversationId, setCurrentConversationId] = React.useState<
    string | undefined
  >('1');
  const conversations = generateMockConversations();

  return (
    <div className="p-4">
      <ConversationHistory
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={(id) => {
          console.log('Selected conversation:', id);
          setCurrentConversationId(id);
        }}
        onNewConversation={() => {
          console.log('New conversation clicked');
          setCurrentConversationId(undefined);
        }}
        onConversationEdit={(id, newTitle) => {
          console.log('Edit conversation:', id, newTitle);
        }}
        onConversationDelete={(id) => {
          console.log('Delete conversation:', id);
        }}
        onConversationsDelete={(ids) => {
          console.log('Delete conversations:', ids);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};

export const NoCurrentConversation: Story = {
  render: () => {
    const conversations = generateMockConversations();

    return (
      <div className="p-4">
        <ConversationHistory
          conversations={conversations}
          onConversationSelect={(id) =>
            console.log('Selected conversation:', id)
          }
          onNewConversation={() => console.log('New conversation clicked')}
          onConversationEdit={(id, newTitle) =>
            console.log('Edit conversation:', id, newTitle)
          }
          onConversationDelete={(id) => console.log('Delete conversation:', id)}
          onConversationsDelete={(ids) =>
            console.log('Delete conversations:', ids)
          }
        />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    return (
      <div className="p-4">
        <ConversationHistory
          conversations={[]}
          onConversationSelect={(id) =>
            console.log('Selected conversation:', id)
          }
          onNewConversation={() => console.log('New conversation clicked')}
        />
      </div>
    );
  },
};

export const SheetMode: Story = {
  render: () => {
    const conversations = generateMockConversations();
    return (
      <div className="bg-muted/20 flex h-[400px] w-full items-center justify-center rounded-xl border">
        <ConversationHistory
          displayMode="sheet"
          triggerVariant="pill"
          conversations={conversations}
          currentConversationId="1"
          onConversationSelect={(id) => console.log('Selected:', id)}
        />
      </div>
    );
  },
};

export const SheetLeft: Story = {
  render: () => {
    const conversations = generateMockConversations();
    return (
      <div className="bg-muted/20 flex h-[400px] w-full items-center justify-center rounded-xl border">
        <ConversationHistory
          displayMode="sheet"
          side="left"
          triggerVariant="icon"
          conversations={conversations}
          currentConversationId="1"
          onConversationSelect={(id) => console.log('Selected:', id)}
        />
      </div>
    );
  },
};

export const GhostTrigger: Story = {
  render: () => {
    const conversations = generateMockConversations();
    return (
      <div className="bg-muted/20 flex h-[200px] w-full items-center justify-center rounded-xl border">
        <div className="flex items-center gap-4">
          <ConversationHistory
            triggerVariant="ghost"
            conversations={conversations}
            onConversationSelect={(id) => console.log('Selected:', id)}
          />
          <span className="text-muted-foreground text-sm font-medium">
            Click icon to open history
          </span>
        </div>
      </div>
    );
  },
};

const WithManyConversationsComponent = () => {
  const [currentConversationId, setCurrentConversationId] = React.useState<
    string | undefined
  >('1');
  const conversations = React.useMemo(() => {
    const baseConversations = generateMockConversations();
    const additionalConversations: Conversation[] = [];
    const now = new Date();

    // Add more conversations for different time periods
    for (let i = 0; i < 20; i++) {
      const date = new Date(now.getTime() - (i + 3) * 24 * 60 * 60 * 1000);
      additionalConversations.push({
        id: `extra-${i}`,
        slug: `slug-${i}`,
        title: `Deep dive into architecture pattern ${i + 1}`,
        createdAt: date,
        updatedAt: date,
      });
    }

    return [...baseConversations, ...additionalConversations];
  }, []);

  return (
    <div className="flex gap-4 p-4">
      <ConversationHistory
        displayMode="dialog"
        triggerVariant="icon"
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={(id) => {
          console.log('Selected conversation:', id);
          setCurrentConversationId(id);
        }}
      />
      <ConversationHistory
        displayMode="sheet"
        triggerVariant="pill"
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={(id) => {
          console.log('Selected conversation:', id);
          setCurrentConversationId(id);
        }}
      />
    </div>
  );
};

export const WithManyConversations: Story = {
  render: () => <WithManyConversationsComponent />,
};
