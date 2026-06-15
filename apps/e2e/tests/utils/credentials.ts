/**
 * Generates a random email in the local `@rasm.ai` domain. We use a
 * consistent domain so Inbucket mailboxes stay grouped and so that local
 * Supabase never tries to actually deliver the mail over SMTP.
 */
export function createRandomEmail(): string {
  const value = Math.random() * 10_000_000_000;
  return `${value.toFixed(0)}@rasm.ai`;
}

/**
 * Default password that satisfies the password schema regardless of which
 * optional requirements (`VITE_PASSWORD_REQUIRE_*`) are enabled — it has
 * uppercase, numbers, a special char and is well above the min length.
 * See `packages/features/auth/src/schemas/password.schema.ts`.
 */
export const DEFAULT_PASSWORD = 'Testing1234!';
