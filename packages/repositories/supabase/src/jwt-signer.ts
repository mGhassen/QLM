import jwt from 'jsonwebtoken';
import {
  IJwtSigner,
  type JwtSignerOptions,
  type JwtSignerPayload,
} from '@qlm/domain/repositories';

/**
 * Concrete `IJwtSigner` backed by the `jsonwebtoken` package.
 *
 * Stateless by design: the secret travels in `options.secret` on every call
 * so there is exactly one source of truth (the factory at server boot reads
 * `process.env.JWT_SECRET` and hands it to the `CreateUserTokenService`).
 *
 * Pinned to HS256 to match the JWT shape `qlm-public-api` and
 * `qlm-cli` already accept — see RFC 0009 spec §6.3.
 */
export class JwtSigner extends IJwtSigner {
  sign(payload: JwtSignerPayload, options: JwtSignerOptions): string {
    return jwt.sign(payload, options.secret, {
      algorithm: options.algorithm,
    });
  }
}
