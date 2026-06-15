import type { EnrollTotpOutput, MfaFactor } from '@guepard/domain/entities';
import { IMfaRepository } from '@guepard/domain/repositories';

import type { SupabaseClientType } from './types';

/**
 * Supabase-backed `IMfaRepository`. Delegates to `client.auth.mfa.*` and
 * maps responses to the domain shape. Phase-1 supports TOTP factors only.
 */
export class SupabaseMfaRepository extends IMfaRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  async listFactors(): Promise<MfaFactor[]> {
    const { data, error } = await this.client.auth.mfa.listFactors();
    if (error) {
      throw new Error(`Failed to list MFA factors: ${error.message}`);
    }
    return (data?.totp ?? []).map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? factor.id,
      factorType: 'totp' as const,
      status: factor.status as 'unverified' | 'verified',
      createdAt: factor.created_at,
    }));
  }

  async enrollTotp(friendlyName: string): Promise<EnrollTotpOutput> {
    const { data, error } = await this.client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });
    if (error) {
      throw new Error(`Failed to enroll factor: ${error.message}`);
    }
    return {
      id: data.id,
      totp: {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
    };
  }

  async challenge(factorId: string): Promise<{ challengeId: string }> {
    const { data, error } = await this.client.auth.mfa.challenge({ factorId });
    if (error) {
      throw new Error(`Failed to issue MFA challenge: ${error.message}`);
    }
    return { challengeId: data.id };
  }

  async verify(input: {
    factorId: string;
    challengeId: string;
    code: string;
  }): Promise<void> {
    const { error } = await this.client.auth.mfa.verify(input);
    if (error) {
      throw new Error(`Failed to verify MFA factor: ${error.message}`);
    }
  }

  async unenroll(factorId: string): Promise<void> {
    const { error } = await this.client.auth.mfa.unenroll({ factorId });
    if (error) {
      throw new Error(`Failed to unenroll MFA factor: ${error.message}`);
    }
  }
}
