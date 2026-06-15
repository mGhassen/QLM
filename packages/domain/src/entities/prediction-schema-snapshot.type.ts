import { z } from 'zod';

import { DatasourceMetadataZodSchema } from './datasource-meta';

export const PredictionSchemaSnapshotZodSchema = z.object({
  id: z.uuid().describe('The unique identifier of the snapshot'),
  datasourceId: z
    .string()
    .uuid()
    .describe('The datasource the snapshot was taken from'),
  projectId: z
    .string()
    .uuid()
    .describe('The project the snapshot belongs to (RLS scope key)'),
  version: z
    .number()
    .int()
    .positive()
    .describe('Monotonically increasing version per datasource'),
  metadata: DatasourceMetadataZodSchema.describe(
    'Frozen DatasourceMetadata captured at snapshot time',
  ),
  takenBy: z.string().uuid().describe('The user who took the snapshot'),
  takenAt: z.date().describe('The instant the snapshot was created'),
});

export type PredictionSchemaSnapshot = z.infer<
  typeof PredictionSchemaSnapshotZodSchema
>;
