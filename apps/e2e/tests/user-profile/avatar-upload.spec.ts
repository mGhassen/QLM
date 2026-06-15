import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { UserProfilePageObject } from './user-profile.po';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * RFC 0025 phase-1 spec §3.3 F2/F3 + §3.4 client-side validation —
 * upload a small PNG, confirm Clear becomes available; clear it,
 * confirm Clear disappears; try a non-image file, confirm inline
 * rejection without a Storage call.
 *
 * Single-test linear flow because each Playwright test gets a fresh
 * `page` / context — see profile-navigation.spec.ts for rationale.
 */
test.describe('user-profile: avatar upload', () => {
  test('uploads PNG, clears, then rejects a non-image inline', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    const profile = new UserProfilePageObject(page);
    const email = createRandomEmail();
    const projectLandingUrlPattern = /\/prj\/[^/]+/;
    const avatarFixture = path.join(here, 'fixtures/avatar.png');

    await auth.goToSignUp();
    await auth.signUp({ email, password: DEFAULT_PASSWORD });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });

    await profile.goToProfile();

    // F2 — upload a real PNG → Clear affordance becomes available.
    await profile.uploadAvatar(avatarFixture);
    await profile.expectAvatarVisible();

    // F3 — clear the avatar; Clear disappears.
    await profile.clickClearAvatar();
    await profile.expectAvatarCleared();

    // §3.4 — non-image file is rejected client-side; no Storage call.
    const storageCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (request.method() === 'POST' && url.includes('/storage/v1/object/')) {
        storageCalls.push(url);
      }
    });

    await profile.pictureInput().setInputFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await profile.expectPictureError();
    expect(storageCalls).toEqual([]);
  });
});
