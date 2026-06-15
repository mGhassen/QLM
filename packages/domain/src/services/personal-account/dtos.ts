import { z } from 'zod';

/**
 * Input for `UpdatePersonalAccountService`. At least one of `name` or
 * `pictureUrl` must be present; an empty patch is a no-op but callers
 * should not submit it.
 */
export const UpdatePersonalAccountInputSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(255).optional(),
  pictureUrl: z.string().url().nullable().optional(),
});

export type UpdatePersonalAccountInput = z.infer<
  typeof UpdatePersonalAccountInputSchema
>;

/**
 * Allowed avatar file extensions. Mirrors the client-side MIME gate
 * (`image/png`, `image/jpeg`, `image/webp`, `image/gif`) but expressed
 * as the dotless extension actually written to the storage path.
 */
export const ALLOWED_AVATAR_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
] as const;
export type AllowedAvatarExtension = (typeof ALLOWED_AVATAR_EXTENSIONS)[number];

/**
 * Input for `UploadAvatarService`. `bytes` is opaque to the domain — the
 * service only checks size > 0; the adapter handles the actual write.
 * Extension is normalised to lowercase before being written into the
 * cache-busted path `{userId}.{extension}?v={nanoid}`.
 */
export const UploadAvatarInputSchema = z.object({
  userId: z.string().uuid(),
  bytes: z.instanceof(ArrayBuffer),
  extension: z
    .string()
    .toLowerCase()
    .refine(
      (ext) => (ALLOWED_AVATAR_EXTENSIONS as readonly string[]).includes(ext),
      { message: 'Unsupported image extension.' },
    ),
});

export type UploadAvatarInput = z.infer<typeof UploadAvatarInputSchema>;

export const ClearAvatarInputSchema = z.object({
  userId: z.string().uuid(),
});

export type ClearAvatarInput = z.infer<typeof ClearAvatarInputSchema>;

/**
 * Input for `UpdatePasswordService`. The service drives a re-auth via
 * `signInWithPassword({ email: sessionEmail, password: current })` before
 * updating; consumers must supply the session's email so the domain stays
 * free of session-state coupling.
 *
 * `next` enforces the project's minimum length (8). Tighter rules
 * (HIBP k-anonymity, password-strength meter) belong to phase 2.
 */
export const UpdatePasswordInputSchema = z
  .object({
    sessionEmail: z.string().email(),
    current: z.string().min(1),
    next: z.string().min(8),
  })
  .refine((value) => value.current !== value.next, {
    message: 'New password must differ from the current password.',
    path: ['next'],
  });

export type UpdatePasswordInput = z.infer<typeof UpdatePasswordInputSchema>;
