import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import type { Repositories } from '@guepard/domain/repositories';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@guepard/extensions-sdk';
import { getDriverInstance } from '@guepard/extensions-loader';
import { handleDomainException } from '../lib/http-utils';

const notebookQueryBodySchema = z.object({
  conversationId: z.string().min(1),
  query: z.string().min(1),
  datasourceId: z.string().min(1),
});

export function createNotebookQueryRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', zValidator('json', notebookQueryBodySchema), async (c) => {
    try {
      const { query, datasourceId } = c.req.valid('json');

      const repos = await getRepositories(c);
      const datasource = await repos.datasource.findById(datasourceId);
      if (!datasource) {
        return c.json({ error: `Datasource ${datasourceId} not found` }, 404);
      }

      const extension = ExtensionsRegistry.get(
        datasource.datasource_provider,
      ) as DatasourceExtension | undefined;

      if (!extension?.drivers?.length) {
        return c.json(
          {
            error: `No driver found for provider: ${datasource.datasource_provider}`,
          },
          404,
        );
      }

      const nodeDriver =
        extension.drivers.find((d) => d.runtime === 'node') ??
        extension.drivers[0];

      if (!nodeDriver || nodeDriver.runtime !== 'node') {
        return c.json(
          {
            error: `No node driver for provider: ${datasource.datasource_provider}`,
          },
          400,
        );
      }

      const instance = await getDriverInstance(nodeDriver, {
        config: datasource.config,
      });

      const expectedDbName = datasource.name;

      try {
        const trimmedQuery = query.trim();

        try {
          const result = await instance.query(trimmedQuery);
          const data = {
            ...result,
            stat: result.stat ?? {
              rowsAffected: 0,
              rowsRead: result.rows.length,
              rowsWritten: 0,
              queryDurationMs: null,
            },
          };
          return c.json({ success: true, data });
        } catch (queryError) {
          const errorMessage =
            queryError instanceof Error
              ? queryError.message
              : String(queryError);
          if (
            errorMessage.includes('does not exist') ||
            errorMessage.includes('Catalog Error')
          ) {
            return c.json(
              {
                error: `Query failed: ${errorMessage}. Expected database: "${expectedDbName}".`,
              },
              400,
            );
          }
          throw queryError;
        }
      } finally {
        if (typeof instance.close === 'function') {
          await instance.close();
        }
      }
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
