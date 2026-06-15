import { z } from 'zod';

export const SmtpConfigSchema = z.object({
  user: z.string({
    error: (issue) =>
      issue.input === undefined
        ? 'Please provide the variable EMAIL_USER'
        : 'Expected string',
  }),
  pass: z.string({
    error: (issue) =>
      issue.input === undefined
        ? 'Please provide the variable EMAIL_PASSWORD'
        : 'Expected string',
  }),
  host: z.string({
    error: (issue) =>
      issue.input === undefined
        ? 'Please provide the variable EMAIL_HOST'
        : 'Expected string',
  }),
  port: z.number({
    error: (issue) =>
      issue.input === undefined
        ? 'Please provide the variable EMAIL_PORT'
        : 'Expected number',
  }),
  secure: z.boolean({
    error: (issue) =>
      issue.input === undefined
        ? 'Please provide the variable EMAIL_TLS'
        : 'Expected boolean',
  }),
});
