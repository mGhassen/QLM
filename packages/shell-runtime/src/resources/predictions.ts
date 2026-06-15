import type { QueryClient } from '@tanstack/react-query';

import type {
  DatasourceMetadata,
  PredictionAgentConversation,
  PredictionAgentMessage,
  PredictionSchemaSnapshot,
} from '@qlm/domain/entities';
import type {
  IPredictionAgentConversationRepository,
  IPredictionAgentMessageRepository,
  IPredictionSchemaSnapshotRepository,
} from '@qlm/domain/repositories';

/**
 * Host-provided HTTP shape for Predictions operations that don't fit a
 * plain port — server-side metadata fetch, client-fallback metadata
 * upload, and the streaming agent endpoint.
 */
export type PredictionsHttpClient = {
  takeSnapshot(datasourceId: string): Promise<PredictionSchemaSnapshot>;
  takeSnapshotFromClient(
    datasourceId: string,
    metadata: DatasourceMetadata,
  ): Promise<PredictionSchemaSnapshot>;
  /**
   * Streams the assistant response for one user message. Returns a
   * `ReadableStream` of UTF-8-decoded text chunks. The host implementation
   * fetches the SSE/text endpoint and yields decoded chunks.
   */
  streamAgentMessage(input: {
    conversationId: string;
    content: string;
  }): Promise<ReadableStream<string>>;
};

/** Status value carried inline on a 422 response for browser-runtime drivers. */
export const BROWSER_RUNTIME_ONLY_ERROR = 'browser_runtime_only';

export function createPredictionsResource(
  snapshots: IPredictionSchemaSnapshotRepository,
  conversations: IPredictionAgentConversationRepository,
  messages: IPredictionAgentMessageRepository,
  http: PredictionsHttpClient,
  getDatasourceMetadataForId: (
    datasourceId: string,
  ) => Promise<DatasourceMetadata>,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['predictions'] as const,
    snapshotsByDatasource: (datasourceId: string) =>
      ['predictions', 'snapshots', 'datasource', datasourceId] as const,
    snapshot: (id: string) => ['predictions', 'snapshot', id] as const,
    latestSnapshot: (datasourceId: string) =>
      ['predictions', 'snapshot', 'latest', datasourceId] as const,
    conversation: (id: string) =>
      ['predictions', 'conversation', id] as const,
    messages: (conversationId: string) =>
      ['predictions', 'messages', conversationId] as const,
  };

  return {
    keys,

    snapshots: {
      async list(datasourceId: string): Promise<PredictionSchemaSnapshot[]> {
        return snapshots.listByDatasource(datasourceId);
      },
      async latest(
        datasourceId: string,
      ): Promise<PredictionSchemaSnapshot | null> {
        return snapshots.findLatestByDatasource(datasourceId);
      },
      async get(id: string): Promise<PredictionSchemaSnapshot | null> {
        return snapshots.findById(id);
      },
      /**
       * Take a fresh snapshot. Tries the server-side path first; on
       * `BROWSER_RUNTIME_ONLY_ERROR` falls back to fetching metadata via
       * the existing host dispatch (browser-runtime drivers run in-process)
       * and posting the metadata back to the from-client endpoint.
       */
      async take(datasourceId: string): Promise<PredictionSchemaSnapshot> {
        try {
          return await http.takeSnapshot(datasourceId);
        } catch (error) {
          const isBrowserRuntimeOnly =
            typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            String((error as { message: unknown }).message).includes(
              BROWSER_RUNTIME_ONLY_ERROR,
            );
          if (!isBrowserRuntimeOnly) throw error;
          const metadata = await getDatasourceMetadataForId(datasourceId);
          return http.takeSnapshotFromClient(datasourceId, metadata);
        }
      },
    },

    agent: {
      async createConversation(
        snapshotId: string,
      ): Promise<PredictionAgentConversation> {
        // Conversation creation goes through the server (which checks RLS).
        // The HTTP repo's `create` posts to the right endpoint.
        return conversations.create({
          id: '',
          snapshotId,
          projectId: '',
          createdBy: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
      async messages(
        conversationId: string,
      ): Promise<PredictionAgentMessage[]> {
        return messages.listByConversation(conversationId);
      },
      /**
       * Sends a user message and streams the assistant's response. Caller
       * receives a string-typed `ReadableStream`; the message persistence
       * happens server-side at start (user message) and end (assistant
       * message).
       */
      async stream(input: {
        conversationId: string;
        content: string;
      }): Promise<ReadableStream<string>> {
        return http.streamAgentMessage(input);
      },
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      snapshotsByDatasource: (datasourceId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.snapshotsByDatasource(datasourceId),
        }),
      snapshot: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.snapshot(id) }),
      messages: (conversationId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.messages(conversationId),
        }),
    },
  };
}

export type PredictionsResource = ReturnType<typeof createPredictionsResource>;
