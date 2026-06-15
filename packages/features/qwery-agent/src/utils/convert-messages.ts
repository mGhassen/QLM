import {
  messageRoleToUIRole,
  normalizeUIRole,
  type UIMessageRole,
} from '@guepard/shared/message-role-utils';
import type { UIMessage } from '@guepard/agent-factory-sdk';
import { MessageOutput } from '@guepard/domain/usecases';

/**
 * Convert `MessageOutput[]` (server shape) to `UIMessage[]` (`@ai-sdk/react`
 * shape) for `<QweryAgentUI initialMessages={...}>`.
 *
 * The full UIMessage structure (id, role, metadata, parts) is stored in
 * `MessageOutput.content` for modern messages. Legacy messages with text-only
 * content are reconstructed into a single text part using `MessageRole`.
 *
 * Ported from qwery-enterprise (`apps/web/lib/utils/messages-converter.ts`).
 */
export function convertMessages(
  messages: MessageOutput[] | undefined,
): UIMessage[] | undefined {
  if (!messages) {
    return undefined;
  }

  return messages.map((message) => {
    const createdAt =
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : new Date(message.createdAt).toISOString();

    if (
      typeof message.content === 'object' &&
      message.content !== null &&
      'parts' in message.content &&
      Array.isArray(message.content.parts) &&
      'role' in message.content
    ) {
      const contentMeta =
        'metadata' in message.content &&
        message.content.metadata &&
        typeof message.content.metadata === 'object'
          ? (message.content.metadata as Record<string, unknown>)
          : {};
      const rootMeta =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as Record<string, unknown>)
          : {};

      return {
        id: message.id,
        role: normalizeUIRole(message.content.role),
        metadata: {
          ...contentMeta,
          ...rootMeta,
          createdAt,
        },
        parts: message.content.parts as UIMessage['parts'],
      };
    }

    // Legacy format — reconstruct from MessageRole + raw content.
    const role: UIMessageRole = messageRoleToUIRole(message.role);
    const text =
      typeof message.content === 'object' &&
      message.content !== null &&
      'text' in message.content
        ? String(message.content.text)
        : typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);

    return {
      id: message.id,
      role,
      metadata: { createdAt },
      parts: [{ type: 'text', text }],
    };
  });
}

/**
 * Inverse of `convertMessages` — used when we need to persist a `UIMessage`
 * back to `MessageEntity.content` (e.g. message updates). Lifted as-is from
 * qwery-enterprise; not used by phase-1 panel/tab but kept for future stories.
 */
export function convertUIMessageToContent(
  uiMessage: UIMessage,
): Record<string, unknown> {
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    metadata: uiMessage.metadata,
    parts: uiMessage.parts,
  };
}
