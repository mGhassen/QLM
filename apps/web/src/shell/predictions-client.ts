import type { DatasourceMetadata } from '@guepard/domain/entities';
import type { PredictionsHostClient } from '@guepard/shell-runtime';

import {
  apiPost,
  ApiError,
  getAuthHeaders,
} from '@/lib/repositories/api-client';

function getApiBaseUrl(): string {
  return import.meta.env?.VITE_API_URL || '/api';
}

/**
 * Host-side `PredictionsHostClient` implementation. Wraps the three
 * server endpoints that don't fit a plain repository port:
 *  - `takeSnapshot` posts to `/predictions/datasources/:id/snapshots`
 *    (server-side `driver.metadata()`).
 *  - `takeSnapshotFromClient` uploads metadata captured in the browser.
 *  - `streamAgentMessage` POSTs to the agent endpoint and returns a
 *    decoded `ReadableStream<string>` of assistant text.
 */
export const predictionsClient: PredictionsHostClient = {
  async takeSnapshot(datasourceId) {
    return apiPost(
      `/predictions/datasources/${datasourceId}/snapshots`,
      undefined,
    );
  },

  async takeSnapshotFromClient(
    datasourceId: string,
    metadata: DatasourceMetadata,
  ) {
    return apiPost(
      `/predictions/datasources/${datasourceId}/snapshots/from-client`,
      { metadata },
    );
  },

  async streamAgentMessage({ conversationId, content }) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    };
    const response = await fetch(
      `${getApiBaseUrl()}/predictions/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: response.statusText || 'Request failed',
      }));
      throw new ApiError(
        errorBody.error || 'Agent stream failed',
        response.status,
        errorBody.code,
        errorBody.data,
      );
    }
    if (!response.body) {
      throw new Error('Agent endpoint returned empty body');
    }
    // Decode the byte stream into UTF-8 text chunks for the consumer.
    const decoder = new TextDecoder();
    return response.body.pipeThrough(
      new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          controller.enqueue(decoder.decode(chunk, { stream: true }));
        },
        flush(controller) {
          const tail = decoder.decode();
          if (tail) controller.enqueue(tail);
        },
      }),
    );
  },
};
