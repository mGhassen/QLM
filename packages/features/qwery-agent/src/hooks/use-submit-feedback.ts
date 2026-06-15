import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useShell } from '@qlm/shell-runtime';
import { getAuthHeaders } from '@qlm/supabase/auth-headers';
import type { FeedbackPayload } from '@qlm/ui/ai';

export type SubmitFeedbackInput = {
  messageId: string;
  feedback: FeedbackPayload;
};

export type UseSubmitFeedbackOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Port of qwery-enterprise's `useSubmitFeedback`. Posts `{ messageId, ...feedback }`
 * to `/api/feedback` with the Supabase bearer token, then invalidates the
 * message list for the conversation so the updated feedback metadata shows up
 * on the next render. Feature-local (no shell-runtime resource) — mirrors
 * `use-billing-balance.ts`'s pattern of hitting the server API directly.
 */
export function useSubmitFeedback(
  conversationSlug: string,
  options?: UseSubmitFeedbackOptions,
) {
  const shell = useShell();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          messageId: input.messageId,
          ...input.feedback,
        }),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errorBody.error ?? `Failed to submit feedback: ${res.status}`,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shell.messages.keys.byConversationSlug(conversationSlug),
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
}
