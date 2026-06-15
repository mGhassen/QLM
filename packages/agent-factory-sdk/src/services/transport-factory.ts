import {
  defaultTransport,
  type DefaultTransportOptions,
} from './default-transport';

function getChatApiUrl(conversationSlug: string): string {
  const baseUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_CHAT_API_URL) ||
    (typeof process !== 'undefined' && process.env?.QWERY_SERVER_URL);
  if (baseUrl) {
    const base = String(baseUrl).replace(/\/$/, '');
    return `${base}/chat/${conversationSlug}`;
  }
  return `/api/chat/${conversationSlug}`;
}

export interface TransportFactoryOptions {
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

export const transportFactory = (
  conversationSlug: string,
  model: string,
  options?: TransportFactoryOptions,
) => {
  const transportOptions: DefaultTransportOptions = {
    getHeaders: options?.getHeaders,
  };

  if (!model.includes('/')) {
    return defaultTransport(getChatApiUrl(conversationSlug), transportOptions);
  }

  const [provider] = model.split('/');

  switch (provider) {
    case 'transformer-browser':
    case 'webllm':
    default:
      return defaultTransport(
        getChatApiUrl(conversationSlug),
        transportOptions,
      );
  }
};
