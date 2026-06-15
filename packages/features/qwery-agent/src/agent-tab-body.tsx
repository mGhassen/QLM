import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SUPPORTED_MODELS, transportFactory } from '@guepard/agent-factory-sdk';
import { initDatasourceRegistry } from '@guepard/extensions-loader';
import { useShell } from '@guepard/shell-runtime';
import { getAuthHeaders } from '@guepard/supabase/auth-headers';
import QweryAgentUI from '@guepard/ui/agent-ui';
import type { DatasourceItem, FeedbackPayload } from '@guepard/ui/ai';

import { CreditsBanner } from './credits-banner';
import { useBillingBalance } from './hooks/use-billing-balance';
import { useSubmitFeedback } from './hooks/use-submit-feedback';
import { buildPluginLogoMap } from './utils/build-plugin-logo-map';
import { convertMessages } from './utils/convert-messages';

// Populate the datasource extensions registry once so we can resolve
// brand icons in the selector. Idempotent.
initDatasourceRegistry();

export type AgentTabBodyProps = {
  /** Slug of the conversation this tab displays. */
  conversationSlug: string;
};

/**
 * Full-width agent body mounted inside the `/agent/$conversationSlug` shell
 * tab (RFC 0008 Amendment A1). Looks up the conversation by slug and renders
 * `<QweryAgentUI>` end-to-end with the same composition the panel uses.
 *
 * Does **not** accept plugin-contributed `initialSuggestions`: tab view is
 * conversation-scoped (user came from a specific `/agent/<slug>` URL), not
 * route/plugin-scoped. Per-plugin prompts belong to the panel only.
 */
export function AgentTabBody({
  conversationSlug,
}: Readonly<AgentTabBodyProps>) {
  const shell = useShell();
  const queryClient = useQueryClient();
  const { data: billing } = useBillingBalance();
  const isOutOfCredits = billing !== undefined && billing.balance <= 0;

  const {
    data: conversation,
    isLoading: conversationLoading,
    isError: conversationError,
  } = useQuery({
    queryKey: shell.conversations.keys.bySlug(conversationSlug),
    queryFn: () => shell.conversations.getBySlug(conversationSlug),
    enabled: !!conversationSlug && !isOutOfCredits,
  });

  const { data: rawMessages } = useQuery({
    queryKey: shell.messages.keys.byConversationSlug(conversationSlug),
    queryFn: () => shell.messages.getByConversationSlug(conversationSlug),
    enabled: !!conversation,
  });

  const { data: projectDatasources, isLoading: datasourcesLoading } = useQuery({
    queryKey: shell.datasources.keys.listByProject(),
    queryFn: () => shell.datasources.list(),
  });
  const datasources: DatasourceItem[] = useMemo(
    () =>
      (projectDatasources ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        datasource_provider: d.datasource_provider,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    [projectDatasources],
  );
  const pluginLogoMap = useMemo(() => buildPluginLogoMap(), []);

  // Selection is derived directly from the conversation row so we
  // never duplicate server state into local state. On user toggle we
  // optimistically patch the conversation in the React Query cache
  // (instant UI), then fire the mutation. Persistence failure is
  // non-fatal — chat.ts also accepts `datasources` on the request body,
  // so the next send still works.
  const selectedDatasources = useMemo(
    () => conversation?.datasources ?? [],
    [conversation?.datasources],
  );
  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (!conversation) return;
      queryClient.setQueryData(
        shell.conversations.keys.bySlug(conversation.slug),
        { ...conversation, datasources: ids },
      );
      void shell.conversations
        .update({ id: conversation.id, datasources: ids })
        .catch(() => {});
    },
    [conversation, queryClient, shell],
  );

  const transport = useMemo(() => {
    if (!conversation) return null;
    return (model: string) =>
      transportFactory(conversation.slug, model, {
        getHeaders: getAuthHeaders,
      });
  }, [conversation]);

  const { t } = useTranslation('chat');
  const submitFeedback = useSubmitFeedback(conversationSlug, {
    onSuccess: () => toast.success(t('feedback.success')),
    onError: () => toast.error(t('feedback.error')),
  });
  const onSubmitFeedback = useCallback(
    async (messageId: string, feedback: FeedbackPayload) => {
      await submitFeedback.mutateAsync({ messageId, feedback });
    },
    [submitFeedback],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        {isOutOfCredits ? (
          <CreditsBanner orgSlug={shell.orgSlug} />
        ) : conversationError ? (
          <NotFoundPlaceholder />
        ) : conversationLoading ? (
          <LoadingPlaceholder />
        ) : !conversation ? (
          // Query settled with null data — the slug points at a conversation
          // that no longer exists (e.g. DB reset, hard delete). Treat as
          // not-found instead of looping the loader.
          <NotFoundPlaceholder />
        ) : !transport ? (
          <LoadingPlaceholder />
        ) : (
          <QweryAgentUI
            initialMessages={convertMessages(rawMessages)}
            transport={transport}
            models={SUPPORTED_MODELS}
            conversationSlug={conversation.slug}
            datasources={datasources}
            datasourcesLoading={datasourcesLoading}
            selectedDatasources={selectedDatasources}
            onDatasourceSelectionChange={handleSelectionChange}
            getDatasourcesForSend={() => selectedDatasources}
            pluginLogoMap={pluginLogoMap}
            onSubmitFeedback={onSubmitFeedback}
          />
        )}
      </div>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <p className="text-muted-foreground text-sm">Loading conversation…</p>
    </div>
  );
}

function NotFoundPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <p className="text-muted-foreground text-sm">Conversation not found.</p>
    </div>
  );
}
