import type { QueryClient } from '@tanstack/react-query';

import type { PersonalAccount } from '@qlm/domain/entities';
import type { IAccountRepository } from '@qlm/domain/repositories';
import {
  ClearAvatarService,
  GetPersonalAccountService,
  UpdatePasswordService,
  UpdatePersonalAccountService,
  UploadAvatarService,
} from '@qlm/domain/services';

/**
 * Shell-runtime resource for the signed-in user's personal `accounts` row.
 *
 * The shared query key `['personal-account', userId]` is intentionally
 * consumed by both `useShell().personalAccount.getMine` AND the topbar
 * avatar/name component (see `apps/web/src/shell/project-shell-host.tsx`)
 * so that `updateMine` / `uploadAvatar` / `clearAvatar` invalidations
 * refresh both surfaces without a reload. This is the resolution for
 * open question #1 in the phase-1 spec.
 *
 * `uploadAvatar` accepts a `File` here (the UI's natural shape) and adapts
 * it to the domain's primitive input (`bytes` + `extension`) before
 * calling the service, so the domain stays free of DOM types.
 */
export function createPersonalAccountResource(
  repository: IAccountRepository,
  queryClient: QueryClient,
  currentUserId: string,
) {
  const keys = {
    mine: ['personal-account', currentUserId] as const,
  };

  const invalidate = {
    mine: () => queryClient.invalidateQueries({ queryKey: keys.mine }),
  };

  function getMine(): Promise<PersonalAccount | null> {
    return new GetPersonalAccountService(repository).execute({
      userId: currentUserId,
    });
  }

  async function updateMine(patch: {
    name?: string;
    pictureUrl?: string | null;
  }): Promise<PersonalAccount> {
    const result = await new UpdatePersonalAccountService(repository).execute({
      userId: currentUserId,
      ...patch,
    });
    await invalidate.mine();
    return result;
  }

  async function uploadAvatar(file: File): Promise<PersonalAccount> {
    const bytes = await file.arrayBuffer();
    const extension = extractExtension(file.name);
    const result = await new UploadAvatarService(repository).execute({
      userId: currentUserId,
      bytes,
      extension,
    });
    await invalidate.mine();
    return result;
  }

  async function clearAvatar(): Promise<PersonalAccount> {
    const result = await new ClearAvatarService(repository).execute({
      userId: currentUserId,
    });
    await invalidate.mine();
    return result;
  }

  /**
   * Update the auth password. The caller passes the session email (from
   * `useUser()` in the consumer); the domain stays free of session state.
   */
  async function updatePassword(input: {
    sessionEmail: string;
    current: string;
    next: string;
  }): Promise<void> {
    await new UpdatePasswordService(repository).execute(input);
  }

  return {
    keys,
    getMine,
    updateMine,
    uploadAvatar,
    clearAvatar,
    updatePassword,
    invalidate,
  };
}

export type PersonalAccountResource = ReturnType<
  typeof createPersonalAccountResource
>;

function extractExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1);
}
