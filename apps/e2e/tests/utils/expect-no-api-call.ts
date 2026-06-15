import { expect, type Page } from '@playwright/test';

/**
 * Runs `action` while intercepting any request whose URL matches
 * `endpointGlob`. If the request fires, the test fails immediately.
 *
 * Used by specs that assert client-side validation (Zod, HTML5) blocks
 * the submit before it reaches the API — more robust than matching
 * error copy, which is i18n-sensitive. The route handler is always
 * unregistered when the action resolves or throws.
 *
 * @example
 *   await expectNoApiCall(page, '**\/api/organizations*', async () => {
 *     await page.getByTestId('create-organization-name-input').fill('');
 *     await page.getByTestId('confirm-create-organization-button').click();
 *     await page.waitForTimeout(500);
 *   });
 */
export async function expectNoApiCall<T>(
  page: Page,
  endpointGlob: string,
  action: () => Promise<T>,
): Promise<T> {
  const unexpected: string[] = [];

  await page.route(endpointGlob, (route) => {
    unexpected.push(route.request().url());
    void route.abort();
  });

  try {
    const result = await action();
    expect(
      unexpected,
      `Expected no requests to ${endpointGlob}, got: ${unexpected.join(', ')}`,
    ).toEqual([]);
    return result;
  } finally {
    await page.unroute(endpointGlob);
  }
}
