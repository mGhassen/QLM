import type { DatasourceResultSet } from '@guepard/domain/entities';

import type { RunQueryFn } from '../context';

/**
 * Query execution resource.
 *
 * The actual driver selection + execution happens in the host-provided
 * `runQuery` function. This resource is a thin wrapper that exposes a
 * consistent API to apps.
 */
export function createQueryResource(runQuery: RunQueryFn) {
  return {
    /**
     * Execute a SQL query against a datasource.
     * The driver is resolved by the datasource provider; browser drivers
     * run in-page, node drivers run via the server API.
     */
    async run(input: {
      query: string;
      datasourceId: string;
      /** Optional context (e.g. notebook id for stateful drivers). */
      conversationId?: string;
    }): Promise<DatasourceResultSet> {
      return runQuery(input);
    },
  };
}

export type QueryResource = ReturnType<typeof createQueryResource>;
