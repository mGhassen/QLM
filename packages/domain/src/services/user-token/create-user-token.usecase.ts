import type { IUserTokenRepository, IJwtSigner } from '../../repositories';
import {
  CreateUserTokenInputSchema,
  type CreateUserTokenInput,
  type CreateUserTokenOutput,
} from '../../usecases/dto/user-token-usecase-dto';

/**
 * Creates a new user token and signs its JWT.
 *
 * Flow (matches RFC 0009 spec §4.1 sequence):
 *  1. Validate the input via `CreateUserTokenInputSchema.parse(...)`. The
 *     schema's `.refine` catches expiration violations here, before any
 *     side-effect hits the repo.
 *  2. Call `repo.create(...)` → get back the persisted row with its server-
 *     assigned `id`. Timestamps and user-tracking columns are filled by
 *     Postgres triggers.
 *  3. Sign the JWT, embedding `row.id` as `token_id` so the public-API
 *     validator can look the row up on every request without a full decode.
 *  4. Return `{ row, rawJwt }` — the ONLY place raw token material ever
 *     leaves the server.
 *
 * Failure modes:
 *  - Validation fails → ZodError propagates; the route handler maps it to 400.
 *  - `repo.create` rejects → service rethrows; route handler maps to 500.
 *  - `jwtSigner.sign` throws → service rethrows. The row is already persisted
 *    at this point (we never rollback in phase 1); the failed token is
 *    inaccessible because the user never received `rawJwt`. Story 005's
 *    adapter may add compensating delete later if this proves to matter in
 *    production.
 */
export class CreateUserTokenService {
  constructor(
    private readonly repository: IUserTokenRepository,
    private readonly jwtSigner: IJwtSigner,
    private readonly jwtSecret: string,
  ) {}

  public async execute(
    input: { accountId: string } & CreateUserTokenInput,
  ): Promise<CreateUserTokenOutput> {
    const { accountId, ...dto } = input;
    const { token_name, scopes, expires_at } =
      CreateUserTokenInputSchema.parse(dto);

    const row = await this.repository.create({
      account_id: accountId,
      token_name,
      scopes,
      expires_at,
    });

    const rawJwt = this.jwtSigner.sign(
      {
        token_id: row.id,
        sub: row.account_id,
        scopes: row.scopes,
        exp: row.expires_at,
        aud: 'authenticated',
        role: 'authenticated',
      },
      {
        secret: this.jwtSecret,
        algorithm: 'HS256',
      },
    );

    return { row, rawJwt };
  }
}
