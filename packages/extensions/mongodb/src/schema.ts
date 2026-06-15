import { z } from 'zod';

const connectionUrlField = z
  .string()
  .min(1)
  .regex(/^mongodb(\+srv)?:\/\//, {
    message: 'Must start with mongodb:// or mongodb+srv://',
  })
  .describe('secret:true')
  .meta({
    description:
      'MongoDB connection string (mongodb:// or mongodb+srv://user:pass@host/db)',
    placeholder: 'mongodb+srv://user:pass@cluster0.mongodb.net/mydb',
    secret: true,
  });

const databaseField = z
  .string()
  .min(1)
  .optional()
  .meta({
    label: 'Database',
    description:
      'Database name. If omitted, it is taken from the connection string path.',
  });

export const schema = z.object({
  connectionUrl: connectionUrlField,
  database: databaseField,
});
