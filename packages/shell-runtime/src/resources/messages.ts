import type { QueryClient } from '@tanstack/react-query';

import type {
  IConversationRepository,
  IMessageRepository,
} from '@guepard/domain/repositories';
import { GetMessagesByConversationSlugService } from '@guepard/domain/services';
import type { MessageOutput } from '@guepard/domain/usecases';

export function createMessagesResource(
  messageRepository: IMessageRepository,
  conversationRepository: IConversationRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['messages'] as const,
    byConversationSlug: (slug: string) =>
      ['messages', 'by-conversation-slug', slug] as const,
  };

  return {
    keys,

    async getByConversationSlug(slug: string): Promise<MessageOutput[]> {
      return new GetMessagesByConversationSlugService(
        messageRepository,
        conversationRepository,
      ).execute({ conversationSlug: slug });
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      byConversationSlug: (slug: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.byConversationSlug(slug),
        }),
    },
  };
}

export type MessagesResource = ReturnType<typeof createMessagesResource>;
