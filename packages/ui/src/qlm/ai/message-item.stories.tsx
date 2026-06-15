import type { Meta, StoryObj } from '@storybook/react';
import type { UIMessage } from 'ai';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { MessageItem } from './message-item';
import * as React from 'react';
import type { DatasourceItem } from './datasource-selector';

const storybookI18n = i18next.createInstance();
storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  resources: {
    en: {
      common: {
        sidebar: { edit: 'Edit', copied: 'Copied', copy: 'Copy' },
      },
      chat: {
        export_response: 'Export response',
        export_chat: 'Export chat',
      },
    },
  },
});

const meta: Meta<typeof MessageItem> = {
  title: 'Design System/AI/Message Parts/Message Item',
  component: MessageItem,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <I18nextProvider i18n={storybookI18n as unknown as never}>
        <Story />
      </I18nextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageItem>;

const assistantMessage: UIMessage = {
  id: 'story-assistant-1',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: 'Here is a short assistant reply for Storybook.',
    },
  ],
};

const mockDatasources: DatasourceItem[] = [
  {
    id: 'ds-1',
    name: 'PostgreSQL Database',
    slug: 'postgres-db',
    datasource_provider: 'postgresql',
  },
  {
    id: 'ds-2',
    name: 'MySQL Database',
    slug: 'mysql-db',
    datasource_provider: 'mysql',
  },
  {
    id: 'ds-3',
    name: 'SQLite Database',
    slug: 'sqlite-db',
    datasource_provider: 'sqlite',
  },
];

const mockPluginLogoMap = new Map<string, string>([
  ['postgresql', '/images/datasources/postgresql_icon.png'],
  ['mysql', '/images/datasources/mysql_icon.png'],
  ['sqlite', '/images/datasources/sqlite_icon.png'],
]);

const userMessage: UIMessage = {
  id: 'story-user-1',
  role: 'user',
  parts: [{ type: 'text', text: 'Hello — exercise MessageItem in isolation.' }],
};

function StatefulMessageItemStory({
  message,
  messages,
  lastAssistantMessage,
}: {
  message: UIMessage;
  messages: UIMessage[];
  lastAssistantMessage: UIMessage | undefined;
}) {
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null,
  );
  const [editText, setEditText] = React.useState('');
  const [editDatasources, setEditDatasources] = React.useState<string[]>([]);
  const [copiedMessagePartId, setCopiedMessagePartId] = React.useState<
    string | null
  >(null);

  return (
    <MessageItem
      message={message}
      messages={messages}
      status={undefined}
      lastAssistantMessage={lastAssistantMessage}
      datasources={mockDatasources}
      pluginLogoMap={mockPluginLogoMap}
      editingMessageId={editingMessageId}
      editText={editText}
      editDatasources={editDatasources}
      copiedMessagePartId={copiedMessagePartId}
      onEditStart={(messageId, text, datasourceIds) => {
        setEditingMessageId(messageId);
        setEditText(text);
        setEditDatasources(datasourceIds);
      }}
      onEditSubmit={() => {
        // In-app would persist; in Storybook we just exit edit mode.
        setEditingMessageId(null);
      }}
      onEditCancel={() => {
        setEditingMessageId(null);
      }}
      onEditTextChange={setEditText}
      onEditDatasourcesChange={setEditDatasources}
      onRegenerate={() => {
        // In-app would re-run the last user prompt; Storybook just logs.
        console.log('Regenerate clicked');
      }}
      onCopyPart={(partId) => {
        setCopiedMessagePartId(partId);
        window.setTimeout(() => setCopiedMessagePartId(null), 1500);
      }}
    />
  );
}

export const AssistantText: Story = {
  name: 'Assistant (actions)',
  render: () => (
    <div className="bg-background mx-auto w-full max-w-3xl p-4">
      <StatefulMessageItemStory
        message={assistantMessage}
        messages={[assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
    </div>
  ),
};

export const UserText: Story = {
  name: 'User',
  render: () => (
    <div className="bg-background mx-auto w-full max-w-3xl p-4">
      <StatefulMessageItemStory
        message={userMessage}
        messages={[userMessage, assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
    </div>
  ),
};

export const ConversationThread: Story = {
  name: 'Thread (user + assistant)',
  render: () => (
    <div className="bg-background mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <StatefulMessageItemStory
        message={userMessage}
        messages={[userMessage, assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
      <StatefulMessageItemStory
        message={assistantMessage}
        messages={[userMessage, assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
    </div>
  ),
};

const userMessageWithDatasources: UIMessage = {
  id: 'story-user-ds-1',
  role: 'user',
  metadata: { datasources: ['ds-1', 'ds-3'] },
  parts: [{ type: 'text', text: 'Use Postgres + SQLite for this question.' }],
};

const userMessageWithOtherDatasources: UIMessage = {
  id: 'story-user-ds-2',
  role: 'user',
  metadata: { datasources: ['ds-2'] },
  parts: [{ type: 'text', text: 'Now use MySQL only.' }],
};

export const UserWithDatasources: Story = {
  name: 'User (datasource badges)',
  render: () => (
    <div className="bg-background mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <StatefulMessageItemStory
        message={userMessageWithDatasources}
        messages={[userMessageWithDatasources, assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
      <StatefulMessageItemStory
        message={userMessageWithOtherDatasources}
        messages={[userMessageWithOtherDatasources, assistantMessage]}
        lastAssistantMessage={assistantMessage}
      />
    </div>
  ),
};
