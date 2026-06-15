import type { DatasourceResultSet } from '@qlm/domain/entities';

import { apiPost } from '@/lib/repositories/api-client';

/**
 * Executes a SQL query against a datasource via the server's
 * `/notebook-query` endpoint. The server handles driver selection
 * (browser vs node) and datasource lookup.
 *
 * This is the host-provided implementation for `shell.query.run(...)`.
 */
export async function runQueryAgainstDatasource(input: {
  query: string;
  datasourceId: string;
  conversationId?: string;
}): Promise<DatasourceResultSet> {
  if (!input.query.trim()) {
    throw new Error('Query cannot be empty');
  }

  const response = await apiPost<{
    success: boolean;
    data: DatasourceResultSet;
  }>('/notebook/query', {
    conversationId: input.conversationId ?? '',
    query: input.query,
    datasourceId: input.datasourceId,
  });

  if (!response?.success || !response.data) {
    throw new Error('Query execution failed');
  }

  return response.data;
}
