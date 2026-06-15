import type { Datasource } from '@guepard/domain/entities';
import type { IDatasourceRepository } from '@guepard/domain/repositories';

import { getLogger } from '@guepard/shared/logger';

/**
 * Load datasources from conversation.datasources array
 */
export async function loadDatasources(
  datasourceIds: string[],
  datasourceRepository: IDatasourceRepository,
): Promise<Datasource[]> {
  const loaded: Datasource[] = [];

  for (const datasourceId of datasourceIds) {
    try {
      const datasource = await datasourceRepository.findById(datasourceId);
      if (!datasource) {
        const logger = await getLogger();
        logger.warn(
          `[DatasourceLoader] Datasource ${datasourceId} not found, skipping`,
        );
        continue;
      }

      loaded.push(datasource);
    } catch (error) {
      const logger = await getLogger();
      logger.error(
        `[DatasourceLoader] Failed to load datasource ${datasourceId}:`,
        error,
      );
      // Continue with other datasources even if one fails
    }
  }

  return loaded;
}
