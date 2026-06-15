import { Hono } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import { ExtensionsRegistry, ExtensionScope } from '@qlm/extensions-sdk';

const SCOPE_VALUES = Object.values(ExtensionScope) as [string, ...string[]];

const listQuerySchema = z.object({
  scope: z.enum(SCOPE_VALUES).optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

export function createExtensionsRoutes() {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), (c) => {
    const { scope } = c.req.valid('query');
    const extensions = ExtensionsRegistry.list(
      scope as ExtensionScope | undefined,
    );
    return c.json(
      extensions.map((e) => ({
        ...e,
        schema: null,
        icon: e.icon
          ? e.icon.replace('media', `/extensions/${e.id}`)
          : undefined,
      })),
    );
  });

  app.get('/:id', zValidator('param', idParamSchema), (c) => {
    const { id } = c.req.valid('param');
    const extension = ExtensionsRegistry.get(id);
    if (!extension) {
      return c.json(
        { error: 'Not found', message: `Extension ${id} not found` },
        404,
      );
    }
    const serialized = {
      ...extension,
      schema: null as null,
      icon: extension.icon.replace('media', `/extensions/${extension.id}`),
    };
    return c.json(serialized);
  });

  return app;
}
