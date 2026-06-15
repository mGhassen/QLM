import { DefaultChatTransport } from 'ai';
import { normalizeUIRole } from '@qlm/shared/message-role-utils';

export interface DefaultTransportOptions {
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

export const defaultTransport = (
  api: string,
  options?: DefaultTransportOptions,
) =>
  new DefaultChatTransport({
    api,
    headers: options?.getHeaders,
    prepareSendMessagesRequest: (request) => {
      const { messages, body = {} } = request;
      const lastUserMessageIndex = messages.findLastIndex(
        (m) => normalizeUIRole(m.role) === 'user',
      );
      const lastUserMessage =
        lastUserMessageIndex >= 0 ? messages[lastUserMessageIndex] : undefined;
      return {
        body: {
          ...body,
          messages: lastUserMessage ? [lastUserMessage] : [],
        },
      };
    },
  });
