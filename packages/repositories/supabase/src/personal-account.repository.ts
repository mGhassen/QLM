import { nanoid } from 'nanoid';

import type { PersonalAccount } from '@guepard/domain/entities';
import { invalidCurrentPasswordException } from '@guepard/domain/exceptions';
import { IAccountRepository } from '@guepard/domain/repositories';
import type { Tables } from '@guepard/supabase/database';

import type { SupabaseClientType } from './types';

type AccountRow = Tables<'accounts'>;

const AVATAR_BUCKET = 'account_image';

/**
 * Supabase-backed `IAccountRepository` against `public.accounts` and the
 * `account_image` storage bucket.
 *
 * Reads and writes are narrowed by `user_id = auth.uid()` at the SQL layer;
 * RLS (see `apps/web/supabase/schemas/04-initial-tables.sql`) enforces the
 * same. Storage RLS (`19-storage.sql`) enforces path ownership via
 * `get_storage_filename_as_uuid(name) = auth.uid()` — paths must start with
 * `{userId}.`. `getMine` returns `null` when the auth trigger hasn't
 * inserted the row yet.
 */
export class SupabasePersonalAccountRepository extends IAccountRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  async getMine(userId: string): Promise<PersonalAccount | null> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch personal account: ${error.message}`);
    }

    return data ? toEntity(data) : null;
  }

  async updateMine(
    userId: string,
    patch: { name?: string; pictureUrl?: string | null },
  ): Promise<PersonalAccount> {
    const update: { name?: string; picture_url?: string | null } = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.pictureUrl !== undefined) update.picture_url = patch.pictureUrl;

    const { data, error } = await this.client
      .from('accounts')
      .update(update)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update personal account: ${error.message}`);
    }

    return toEntity(data);
  }

  async uploadAvatar(input: {
    userId: string;
    bytes: ArrayBuffer;
    extension: string;
  }): Promise<PersonalAccount> {
    const { userId, bytes, extension } = input;
    const bucket = this.client.storage.from(AVATAR_BUCKET);

    // Best-effort cleanup of any previous file recorded on the row, so the
    // bucket doesn't accumulate orphans across re-uploads.
    const previous = await this.getMine(userId);
    if (previous?.pictureUrl) {
      const previousPath = extractStoragePath(previous.pictureUrl);
      if (previousPath) {
        // Ignore errors — the file may already be gone.
        await bucket.remove([previousPath]);
      }
    }

    const path = `${userId}.${extension}?v=${nanoid(16)}`;
    const upload = await bucket.upload(path, bytes, {
      contentType: extensionToMime(extension),
      upsert: false,
    });
    if (upload.error) {
      throw new Error(`Failed to upload avatar: ${upload.error.message}`);
    }

    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
    return this.updateMine(userId, { pictureUrl: publicUrl });
  }

  async clearAvatar(userId: string): Promise<PersonalAccount> {
    const bucket = this.client.storage.from(AVATAR_BUCKET);

    const previous = await this.getMine(userId);
    if (previous?.pictureUrl) {
      const previousPath = extractStoragePath(previous.pictureUrl);
      if (previousPath) {
        await bucket.remove([previousPath]);
      }
    }

    return this.updateMine(userId, { pictureUrl: null });
  }

  async updatePassword(input: {
    sessionEmail: string;
    current: string;
    next: string;
  }): Promise<void> {
    const reauth = await this.client.auth.signInWithPassword({
      email: input.sessionEmail,
      password: input.current,
    });
    if (reauth.error) {
      // Generic mapping — the only re-auth failure mode the UI cares about
      // is "current password incorrect". Everything else is a transport
      // error and propagates as-is.
      throw invalidCurrentPasswordException();
    }

    const update = await this.client.auth.updateUser({ password: input.next });
    if (update.error) {
      throw new Error(`Failed to update password: ${update.error.message}`);
    }
  }
}

function toEntity(row: AccountRow): PersonalAccount {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    pictureUrl: row.picture_url,
    updatedAt: row.updated_at,
  };
}

/**
 * `pictureUrl` looks like `https://<host>/storage/v1/object/public/account_image/{userId}.{ext}?v={nanoid}`.
 * The Storage API expects the bucket-relative path, which is everything after
 * `account_image/` (query string included — `nanoid` is part of the file name).
 */
function extractStoragePath(publicUrl: string): string | null {
  const marker = `${AVATAR_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return null;
  return publicUrl.slice(index + marker.length);
}

function extensionToMime(extension: string): string {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
