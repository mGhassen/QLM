import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SUPPORTED_MODELS, transportFactory } from '@qlm/agent-factory-sdk';
import { initDatasourceRegistry } from '@qlm/extensions-loader';
import { useShell } from '@qlm/shell-runtime';
import { getAuthHeaders } from '@qlm/supabase/auth-headers';
import QweryAgentUI from '@qlm/ui/agent-ui';
import type { DatasourceItem, FeedbackPayload } from '@qlm/ui/ai';

import { PanelHeader } from './_panel-header';
import { CreditsBanner } from './credits-banner';
import { useBillingBalance } from './hooks/use-billing-balance';
import { useSubmitFeedback } from './hooks/use-submit-feedback';
import { buildPluginLogoMap } from './utils/build-plugin-logo-map';
import { convertMessages } from './utils/convert-messages';

initDatasourceRegistry();

export type AssistantPanelBodyProps = {
  /**
   * Prompts shown in the panel's empty state. Resolved by the host from the
   * active plugin's `SuggestedPrompts` export (see `apps/web/src/shell/app-registry.ts`),
   * with a shell-level default when no plugin contributes. Leave undefined
   * to let `<QweryAgentUI>` use its own fallback behaviour.
   */
  initialSuggestions?: string[];
};

/**
 * Right-side assistant panel body. Bootstraps the per-(user, project) default
 * conversation, loads message history, builds the streaming transport, and
 * delegates everything else to `<QweryAgentUI>`. Mounts inside the project
 * shell's `RightSidebar` when `activePanel === 'assistant'`.
 */
export function AssistantPanelBody({
  initialSuggestions,
}: Readonly<AssistantPanelBodyProps> = {}) {
  const shell = useShell();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: billing } = useBillingBalance();
  const isOutOfCredits = billing !== undefined && billing.balance <= 0;

  const {
    data: conversation,
    isLoading: conversationLoading,
    isError: conversationError,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: ['conversations', 'default-for-project', shell.projectId],
    queryFn: () => shell.conversations.getDefaultForProject(),
    enabled: !isOutOfCredits,
    // Bootstrap path — single retry then surface to user, otherwise we
    // sit on a "Loading conversation…" placeholder forever on errors.
    retry: 1,
  });

  const { data: rawMessages } = useQuery({
    queryKey: shell.messages.keys.byConversationSlug(conversation?.slug ?? ''),
    queryFn: () =>
      shell.messages.getByConversationSlug(conversation?.slug ?? ''),
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

  // Derive selection directly from the conversation row instead of
  // mirroring it into local state — keeps the server as the single
  // source of truth and avoids the cascading-render / setState-in-effect
  // antipattern. On user toggle we patch the React Query cache
  // synchronously (instant UI) and fire the persistence mutation in
  // the background. Failure is non-fatal — chat.ts also accepts
  // `datasources` on the request body, so the next send still works.
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

  const onOpenInTab = useCallback(() => {
    if (!conversation) return;
    navigate({ to: `/agent/${conversation.slug}` });
  }, [conversation, navigate]);

  const { t } = useTranslation('chat');
  const submitFeedback = useSubmitFeedback(conversation?.slug ?? '', {
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
    <div className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        onOpenInTab={!isOutOfCredits && conversation ? onOpenInTab : undefined}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {isOutOfCredits ? (
          <CreditsBanner orgSlug={shell.orgSlug} />
        ) : conversationLoading ? (
          <LoadingPlaceholder />
        ) : conversationError || !conversation ? (
          // Query settled without a usable conversation. Surface the error
          // with a retry button instead of looping the loader.
          <ErrorPlaceholder onRetry={() => void refetchConversation()} />
        ) : !transport ? (
          <LoadingPlaceholder />
        ) : (
          <QweryAgentUI
            initialMessages={convertMessages(rawMessages)}
            transport={transport}
            models={SUPPORTED_MODELS}
            conversationSlug={conversation.slug}
            initialSuggestions={initialSuggestions}
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

function ErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p className="text-foreground text-sm font-semibold">
        Couldn’t load the conversation.
      </p>
      <p className="text-muted-foreground max-w-xs text-xs">
        The server didn’t return a valid default conversation. This usually
        means the local DB was reset or the server errored out.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border-border bg-muted hover:bg-foreground hover:text-background mt-1 cursor-pointer border-2 px-3 py-1.5 text-xs font-black tracking-widest uppercase transition-all"
      >
        Try again
      </button>
    </div>
  );
}
