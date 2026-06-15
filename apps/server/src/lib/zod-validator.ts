import { zValidator as honoZValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodError } from 'zod';

type ValidatorTarget = keyof ValidationTargets;

function fieldLabel(path: ReadonlyArray<PropertyKey>): string {
  const key = path.length ? String(path[0]) : 'value';
  if (key === 'orgId') return 'Organization ID';
  return key;
}

function formatZodError(error: ZodError, target: ValidatorTarget): string {
  const parts = error.issues.map((issue) => {
    const label = fieldLabel(issue.path);
    return `${label}: ${issue.message}`;
  });
  const joined = parts.join('; ');
  if (target === 'json') {
    return `Invalid request body: ${joined}`;
  }
  return joined;
}

/** Same as `@hono/zod-validator` but 400 responses are `{ error: string }` (not raw `safeParse` JSON). */
export const zValidator = ((
  target: ValidatorTarget,
  schema: Parameters<typeof honoZValidator>[1],
  hook?: Parameters<typeof honoZValidator>[2],
) =>
  honoZValidator(target, schema, async (result, c) => {
    if (result.success === false) {
      return c.json(
        { error: formatZodError(result.error, result.target) },
        400,
      );
    }
    if (hook) {
      return hook(result, c as never);
    }
    return undefined;
  })) as typeof honoZValidator;
