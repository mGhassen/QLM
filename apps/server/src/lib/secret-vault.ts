import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

import type { ISecretVault } from '@guepard/domain/repositories';

/**
 * Server-side implementation of the domain `ISecretVault` port.
 *
 * Phase 1 strategy — **stateless AES-256-GCM**:
 *   - The handle returned by `protect()` is the entire self-describing
 *     ciphertext blob: `enc:v1:<base64url(iv)>:<base64url(authTag)>:<base64url(ciphertext)>`.
 *   - `reveal()` parses that blob and runs AES-GCM decryption.
 *   - There is no external store, so a future `forget()` will be a no-op
 *     (it lands in step 9 alongside a boot-time warning).
 *
 * Trade-off: a compromised server key + a compromised DB row both decrypt
 * every stored credential. That is an explicitly accepted phase-1 risk per
 * RFC 0001 §10 — the mitigation path is OIDC federation in phase 4.
 *
 * Key source: the `GUEPARD_SECRET_VAULT_KEY` env var, interpreted as
 * either a 64-character hex string (32 bytes, the "real" format) or any
 * other string, in which case it is stretched to 32 bytes with `scrypt`.
 * The second path is only there so local dev and test envs can use a
 * memorable phrase without pre-generating a key.
 */

const HANDLE_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12; // GCM nonces are 96 bits
const AUTH_TAG_LENGTH = 16;

function resolveKey(): Buffer {
  const raw = process.env.GUEPARD_SECRET_VAULT_KEY;
  if (!raw) {
    throw new Error(
      'GUEPARD_SECRET_VAULT_KEY is not set. Refusing to start the secret vault without a key.',
    );
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  // scrypt stretch — NOT a substitute for a real 32-byte random key, but
  // lets local dev run with a memorable phrase like "dev-secret".
  return scryptSync(raw, 'guepard.integration-connections.v1', KEY_LENGTH);
}

function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function parseBase64url(input: string): Buffer {
  const padding = '='.repeat((4 - (input.length % 4)) % 4);
  const normalised = (input + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalised, 'base64');
}

/**
 * Concrete vault. Takes the key up-front so tests can pass their own key
 * deterministically. Call `createServerSecretVault()` in production code to
 * read the key from the environment.
 */
export class AesGcmSecretVault implements ISecretVault {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `Secret vault key must be ${KEY_LENGTH} bytes; got ${key.length}`,
      );
    }
  }

  public async protect(
    value: string,
    context: { keyName: string; datasourceId?: string },
  ): Promise<string> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    // AAD binds the ciphertext to the key name so a swapped handle from a
    // different integration can't be decrypted against this row.
    cipher.setAAD(Buffer.from(context.keyName, 'utf8'));
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${HANDLE_PREFIX}${base64url(iv)}:${base64url(authTag)}:${base64url(encrypted)}:${base64url(Buffer.from(context.keyName, 'utf8'))}`;
  }

  public async reveal(protectedValue: string): Promise<string> {
    if (!this.isProtected(protectedValue)) {
      throw new Error('Value is not a vault-protected handle');
    }
    const body = protectedValue.slice(HANDLE_PREFIX.length);
    const parts = body.split(':');
    if (parts.length !== 4) {
      throw new Error('Malformed vault handle');
    }
    const [ivPart, tagPart, ctPart, keyNamePart] = parts as [
      string,
      string,
      string,
      string,
    ];
    const iv = parseBase64url(ivPart);
    const authTag = parseBase64url(tagPart);
    const ciphertext = parseBase64url(ctPart);
    const keyName = parseBase64url(keyNamePart).toString('utf8');

    if (iv.length !== IV_LENGTH) {
      throw new Error('Vault handle has a malformed IV');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Vault handle has a malformed auth tag');
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAAD(Buffer.from(keyName, 'utf8'));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  public isProtected(value: string): boolean {
    return typeof value === 'string' && value.startsWith(HANDLE_PREFIX);
  }

  /**
   * Stateless no-op. This vault doesn't have a backing store — the
   * ciphertext IS the handle. A rotated row simply writes a new handle
   * over `secret_ref`, and the old handle, now unreferenced, ceases to
   * exist as far as Guepard is concerned. There is nothing to reclaim.
   *
   * A boot-time warning is emitted once from `createServerSecretVault()`
   * so operators running this concrete are aware that `forget()` calls
   * are cosmetic — if the DB is ever leaked, every row-level handle is
   * still individually decryptable with the process key. The upgrade
   * path is an external key-store concrete (Supabase Vault / HashiCorp
   * Vault / KMS) that lands whenever we implement rotation-with-reclaim.
   */
  public async forget(_protectedValue: string): Promise<void> {
    // Deliberately empty. See the doc comment above.
  }
}

let cached: ISecretVault | null = null;
let warnedForgetIsNoOp = false;

/**
 * Lazy process-wide singleton. Reads the env var on first call and caches
 * the constructed vault. Tests that need a different key should instantiate
 * `AesGcmSecretVault` directly.
 *
 * On first call, emits a one-time warning that `forget()` is a stateless
 * no-op under the AES-GCM concrete. Operators need to know that rotated
 * credentials don't reclaim any "storage" — the old ciphertext was never
 * stored anywhere other than the row that referenced it. Suppressed in
 * test environments so the test output stays quiet.
 */
export function createServerSecretVault(): ISecretVault {
  if (cached === null) {
    cached = new AesGcmSecretVault(resolveKey());
    if (
      !warnedForgetIsNoOp &&
      process.env.NODE_ENV !== 'test' &&
      process.env.VITEST !== 'true'
    ) {
      warnedForgetIsNoOp = true;
      console.warn(
        '[secret-vault] AesGcmSecretVault is stateless — ISecretVault.forget() is a no-op. ' +
          'Rotated/deleted credentials are unreferenced but not actively reclaimed. ' +
          'Upgrade to an external key-store concrete when rotation-with-reclaim is required.',
      );
    }
  }
  return cached;
}
