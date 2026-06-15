import { describe, expect, it } from 'vitest';

import { Code } from '../../../src/common/code';
import type { PersonalAccount } from '../../../src/entities/personal-account.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IAccountRepository } from '../../../src/repositories/account-repository.port';
import { UploadAvatarService } from '../../../src/services/personal-account/upload-avatar.usecase';

class MockAccountRepository extends IAccountRepository {
  public uploadCalls: Array<{
    userId: string;
    extension: string;
    byteLength: number;
  }> = [];

  async getMine(): Promise<PersonalAccount | null> {
    throw new Error('not used');
  }
  async updateMine(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async clearAvatar(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async uploadAvatar(input: {
    userId: string;
    bytes: ArrayBuffer;
    extension: string;
  }): Promise<PersonalAccount> {
    this.uploadCalls.push({
      userId: input.userId,
      extension: input.extension,
      byteLength: input.bytes.byteLength,
    });
    return {
      id: '11111111-1111-4111-8111-111111111111',
      userId: input.userId,
      name: 'Hani',
      email: null,
      pictureUrl: `https://example.com/${input.userId}.${input.extension}?v=abc`,
      updatedAt: new Date().toISOString(),
    };
  }
}

const USER_ID = '00000000-0000-4000-8000-000000000001';

function makeBytes(size: number): ArrayBuffer {
  return new Uint8Array(size).buffer;
}

describe('UploadAvatarService', () => {
  it('forwards a valid PNG upload to the repository', async () => {
    const repo = new MockAccountRepository();
    const service = new UploadAvatarService(repo);

    const result = await service.execute({
      userId: USER_ID,
      bytes: makeBytes(128),
      extension: 'png',
    });

    expect(repo.uploadCalls).toEqual([
      { userId: USER_ID, extension: 'png', byteLength: 128 },
    ]);
    expect(result.pictureUrl).toMatch(/\.png\?v=/);
  });

  it('lowercases the extension before forwarding', async () => {
    const repo = new MockAccountRepository();
    const service = new UploadAvatarService(repo);

    await service.execute({
      userId: USER_ID,
      bytes: makeBytes(64),
      extension: 'PNG',
    });

    expect(repo.uploadCalls[0]?.extension).toBe('png');
  });

  it('rejects unsupported extensions', async () => {
    const repo = new MockAccountRepository();
    const service = new UploadAvatarService(repo);

    try {
      await service.execute({
        userId: USER_ID,
        bytes: makeBytes(64),
        extension: 'svg',
      });
      expect.fail('expected InvalidProfileInputException');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe(
        Code.INVALID_PROFILE_INPUT_ERROR.code,
      );
    }
    expect(repo.uploadCalls).toHaveLength(0);
  });

  it('rejects empty byte buffers', async () => {
    const repo = new MockAccountRepository();
    const service = new UploadAvatarService(repo);

    await expect(
      service.execute({
        userId: USER_ID,
        bytes: makeBytes(0),
        extension: 'png',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.uploadCalls).toHaveLength(0);
  });

  it('rejects malformed userId', async () => {
    const repo = new MockAccountRepository();
    const service = new UploadAvatarService(repo);

    await expect(
      service.execute({
        userId: 'not-a-uuid',
        bytes: makeBytes(32),
        extension: 'png',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.uploadCalls).toHaveLength(0);
  });
});
