import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const transportFactoryMock = vi.fn();

vi.mock('@qlm/agent-factory-sdk', () => ({
  SUPPORTED_MODELS: [{ name: 'Test', value: 'openai/gpt-4' }],
  transportFactory: (...args: unknown[]) => {
    transportFactoryMock(...args);
    return { __mockTransport: true };
  },
}));

vi.mock('@qlm/supabase/auth-headers', () => ({
  getAuthHeaders: vi
    .fn()
    .mockResolvedValue({ Authorization: 'Bearer test-token' }),
}));

vi.mock('@qlm/ui/agent-ui', () => {
  function MockAgentUI({
    transport,
  }: {
    transport: (model: string) => unknown;
  }) {
    React.useEffect(() => {
      transport?.('openai/gpt-4');
    }, [transport]);
    return React.createElement('div', { 'data-testid': 'agent-ui' });
  }
  return { default: MockAgentUI };
});

type FakeConversation = { id: string; slug: string; projectId: string };

const fakeConversation: FakeConversation = {
  id: 'conv-id',
  slug: 'conv-slug',
  projectId: 'proj-id',
};

const shellStub = {
  projectId: 'proj-id',
  orgSlug: 'acme',
  conversations: {
    keys: { bySlug: (slug: string) => ['conversation', 'by-slug', slug] },
    getDefaultForProject: vi.fn().mockResolvedValue(fakeConversation),
    getBySlug: vi.fn().mockResolvedValue(fakeConversation),
    update: vi.fn().mockResolvedValue(fakeConversation),
  },
  datasources: {
    keys: { listByProject: () => ['datasources', 'project', 'proj-id'] },
    list: vi.fn().mockResolvedValue([]),
  },
  messages: {
    keys: {
      byConversationSlug: (slug: string) => ['messages', 'by-slug', slug],
    },
    getByConversationSlug: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('@qlm/shell-runtime', () => ({
  useShell: () => shellStub,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../src/hooks/use-billing-balance', () => ({
  useBillingBalance: () => ({ data: { balance: 100 } }),
}));

import { AssistantPanelBody } from '../src/assistant-panel-body';
import { AgentTabBody } from '../src/agent-tab-body';

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(React.createElement(QueryClientProvider, { client }, ui));
}

describe('qwery-agent chat auth wiring', () => {
  beforeEach(() => {
    transportFactoryMock.mockClear();
  });

  it('AssistantPanelBody passes getHeaders to transportFactory', async () => {
    renderWithQueryClient(React.createElement(AssistantPanelBody));

    await waitFor(() => {
      expect(transportFactoryMock).toHaveBeenCalled();
    });

    const [slug, model, options] = transportFactoryMock.mock.calls[0] ?? [];
    expect(slug).toBe('conv-slug');
    expect(typeof model).toBe('string');
    expect(options).toBeDefined();
    expect(typeof (options as { getHeaders?: unknown })?.getHeaders).toBe(
      'function',
    );

    const resolved = await (
      options as { getHeaders: () => Promise<Record<string, string>> }
    ).getHeaders();
    expect(resolved).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('AgentTabBody passes getHeaders to transportFactory', async () => {
    renderWithQueryClient(
      React.createElement(AgentTabBody, { conversationSlug: 'conv-slug' }),
    );

    await waitFor(() => {
      expect(transportFactoryMock).toHaveBeenCalled();
    });

    const [slug, , options] = transportFactoryMock.mock.calls[0] ?? [];
    expect(slug).toBe('conv-slug');
    expect(typeof (options as { getHeaders?: unknown })?.getHeaders).toBe(
      'function',
    );

    const resolved = await (
      options as { getHeaders: () => Promise<Record<string, string>> }
    ).getHeaders();
    expect(resolved).toEqual({ Authorization: 'Bearer test-token' });
  });
});
