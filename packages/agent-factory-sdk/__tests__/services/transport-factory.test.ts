import { describe, expect, it, vi, beforeEach } from 'vitest';

const defaultChatTransportSpy = vi.fn();

vi.mock('ai', () => {
  class MockDefaultChatTransport {
    constructor(config: unknown) {
      defaultChatTransportSpy(config);
    }
  }
  return { DefaultChatTransport: MockDefaultChatTransport };
});

vi.mock('@guepard/shared/message-role-utils', () => ({
  normalizeUIRole: (role: string) => role,
}));

import { transportFactory } from '../../src/services/transport-factory';
import { defaultTransport } from '../../src/services/default-transport';

type CapturedConfig = {
  api?: string;
  headers?: unknown;
};

function lastConfig(): CapturedConfig | undefined {
  const call = defaultChatTransportSpy.mock.calls.at(-1);
  return call?.[0] as CapturedConfig | undefined;
}

describe('transportFactory', () => {
  beforeEach(() => {
    defaultChatTransportSpy.mockClear();
  });

  it('forwards getHeaders to DefaultChatTransport when provided', () => {
    const getHeaders = async () => ({ Authorization: 'Bearer test-token' });

    transportFactory('conv-slug', 'openai/gpt-4', { getHeaders });

    expect(defaultChatTransportSpy).toHaveBeenCalledTimes(1);
    const config = lastConfig();
    expect(config?.headers).toBe(getHeaders);
    expect(config?.api).toBe('/api/chat/conv-slug');
  });

  it('falls through with no headers when options are omitted', () => {
    transportFactory('conv-slug', 'openai/gpt-4');

    expect(defaultChatTransportSpy).toHaveBeenCalledTimes(1);
    expect(lastConfig()?.headers).toBeUndefined();
  });

  it('works for models without a provider prefix', () => {
    const getHeaders = async () => ({ Authorization: 'Bearer t' });

    transportFactory('slug', 'bare-model-name', { getHeaders });

    expect(lastConfig()?.headers).toBe(getHeaders);
  });
});

describe('defaultTransport', () => {
  beforeEach(() => {
    defaultChatTransportSpy.mockClear();
  });

  it('passes getHeaders into DefaultChatTransport.headers', () => {
    const getHeaders = async () => ({ Authorization: 'Bearer t' });

    defaultTransport('/api/chat/x', { getHeaders });

    expect(lastConfig()?.headers).toBe(getHeaders);
  });

  it('keeps the one-arg call site working', () => {
    defaultTransport('/api/chat/x');

    expect(lastConfig()?.headers).toBeUndefined();
  });
});
