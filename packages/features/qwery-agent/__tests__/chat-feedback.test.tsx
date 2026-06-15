import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

type CapturedFetchArgs = {
  url: string;
  init?: RequestInit;
};

const fetchMock = vi.fn<(...args: unknown[]) => Promise<Response>>();

vi.stubGlobal('fetch', fetchMock);

vi.mock('@guepard/agent-factory-sdk', () => ({
  SUPPORTED_MODELS: [{ name: 'Test', value: 'openai/gpt-4' }],
  transportFactory: () => ({ __mockTransport: true }),
}));

vi.mock('@guepard/supabase/auth-headers', () => ({
  getAuthHeaders: vi
    .fn()
    .mockResolvedValue({ Authorization: 'Bearer test-token' }),
}));

type CapturedFeedback = {
  messageId: string;
  feedback: { type: 'positive' | 'negative'; comment: string };
};

let capturedFeedback: CapturedFeedback | null = null;

vi.mock('@guepard/ui/agent-ui', () => {
  function MockAgentUI({
    onSubmitFeedback,
  }: {
    onSubmitFeedback?: (
      messageId: string,
      feedback: { type: 'positive' | 'negative'; comment: string },
    ) => Promise<void>;
  }) {
    const firedRef = React.useRef(false);
    React.useEffect(() => {
      if (firedRef.current || !onSubmitFeedback) return;
      firedRef.current = true;
      const payload: CapturedFeedback = {
        messageId: 'msg-1',
        feedback: { type: 'positive', comment: 'great answer' },
      };
      capturedFeedback = payload;
      void onSubmitFeedback(payload.messageId, payload.feedback);
    }, [onSubmitFeedback]);
    return React.createElement('div', { 'data-testid': 'agent-ui' });
  }
  return { default: MockAgentUI };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const shellStub = {
  projectId: 'proj-id',
  orgSlug: 'acme',
  conversations: {
    keys: { bySlug: (slug: string) => ['conversation', 'by-slug', slug] },
    getDefaultForProject: vi
      .fn()
      .mockResolvedValue({ id: 'c1', slug: 'conv-slug', projectId: 'proj-id' }),
    getBySlug: vi
      .fn()
      .mockResolvedValue({ id: 'c1', slug: 'conv-slug', projectId: 'proj-id' }),
    update: vi
      .fn()
      .mockResolvedValue({ id: 'c1', slug: 'conv-slug', projectId: 'proj-id' }),
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

vi.mock('@guepard/shell-runtime', () => ({ useShell: () => shellStub }));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

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

function lastFetchCall(): CapturedFetchArgs | undefined {
  const last = fetchMock.mock.calls.at(-1);
  if (!last) return undefined;
  return { url: String(last[0]), init: last[1] as RequestInit | undefined };
}

describe('qwery-agent feedback wiring', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    capturedFeedback = null;
  });

  it('AssistantPanelBody posts feedback to /api/feedback with the bearer', async () => {
    renderWithQueryClient(React.createElement(AssistantPanelBody));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const call = lastFetchCall();
    expect(call?.url).toBe('/api/feedback');
    expect(call?.init?.method).toBe('POST');
    const headers = call?.init?.headers as Record<string, string> | undefined;
    expect(headers?.['Content-Type']).toBe('application/json');
    expect(headers?.Authorization).toBe('Bearer test-token');

    const body = JSON.parse(String(call?.init?.body));
    expect(body.messageId).toBe(capturedFeedback?.messageId);
    expect(body.type).toBe('positive');
    expect(body.comment).toBe('great answer');
  });

  it('AgentTabBody posts feedback to /api/feedback with the bearer', async () => {
    renderWithQueryClient(
      React.createElement(AgentTabBody, { conversationSlug: 'conv-slug' }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const call = lastFetchCall();
    expect(call?.url).toBe('/api/feedback');
    expect(call?.init?.method).toBe('POST');
    const body = JSON.parse(String(call?.init?.body));
    expect(body.messageId).toBe(capturedFeedback?.messageId);
    expect(body.type).toBe('positive');
  });
});
