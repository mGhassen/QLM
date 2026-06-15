import {
  expect,
  test,
  type BrowserContext,
  type FrameLocator,
  type Page,
} from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { OrganizationPageObject } from '../orgs/org.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { BillingPageObject } from './billing.po';

/**
 * Stripe test-mode checkout happy path.
 *
 * Drives the full client-side payment flow:
 *   Buy credits → enter amount → Continue → Stripe Payment Element
 *   (in a nested iframe) → fill test card → submit → Stripe redirects
 *   back to
 *   `/prj/{projectSlug}/org-settings?section=billing&redirect_status=succeeded&payment_intent=...`
 *   since `return_url: window.location.href` preserves the current URL.
 *
 * This spec needs a Stripe test-mode account wired into the dev server:
 *   - `STRIPE_SECRET_KEY` on the server (apps/server/.env.local or env)
 *   - `VITE_STRIPE_PUBLISHABLE_KEY` on the web client (apps/web/.env.local)
 *   - A billing schema referencing test-mode price IDs
 *
 * Because most CI and local environments don't have those, the describe is
 * gated behind `E2E_STRIPE_HAPPY_PATH=true`. Enable explicitly:
 *
 *   E2E_STRIPE_HAPPY_PATH=true pnpm --filter e2e exec playwright test \
 *     tests/billing/checkout-happy-path.spec.ts
 *
 * The spec stops at the Stripe redirect (client-side `redirect_status`
 * lands on the page). Asserting the balance increment would require the
 * Stripe webhook receiver to be reachable from Stripe's servers, which
 * is its own infra concern — see Stage J for the redirect-URL-handling
 * coverage that the smoke run already exercises.
 */

const STRIPE_HAPPY_PATH_ENABLED =
  process.env.E2E_STRIPE_HAPPY_PATH === 'true';

test.describe('billing: checkout happy path (Stripe test mode)', () => {
  test.describe.configure({ mode: 'serial' });

  // Skip the whole describe when the opt-in env flag is absent. Keeping the
  // file executable (rather than deleted or hidden behind a filter) lets us
  // run it from CI on demand without touching the playwright config.
  test.skip(
    !STRIPE_HAPPY_PATH_ENABLED,
    'Set E2E_STRIPE_HAPPY_PATH=true to enable (needs Stripe test-mode config)',
  );

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `Checkout Happy ${nonce}`;
  // Amount must be within the schema's 10..100 range; $25 is a round value
  // that's easy to eyeball in logs.
  const amountDollars = 25;

  let projectSlug = '';

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('arrange: sign up + create an organization', async () => {
    const auth = new AuthPageObject(page);
    const org = new OrganizationPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    projectSlug = await org.createOrganization(orgName);
    expect(projectSlug.length).toBeGreaterThan(0);
  });

  test('pays with 4242 test card and returns with redirect_status=succeeded', async () => {
    const billing = new BillingPageObject(page);
    await billing.goto(projectSlug);
    await billing.openBuyCreditsDialog();

    // 1. Set the amount and click Continue to provoke payment-intent creation.
    await billing.buyCreditsAmountInput.fill(String(amountDollars));
    await billing.buyCreditsContinueButton.click();

    // 2. The dialog swaps the no-Stripe form for the Elements wrapper. The
    //    Payment Element mounts inside a Stripe-served iframe; we use a
    //    frame locator scoped to that wrapper. Stripe gives the iframe
    //    `title="Secure payment input frame"` — accessible and stable
    //    across Stripe SDK versions.
    const cardFrame: FrameLocator = page.frameLocator(
      'iframe[title="Secure payment input frame"]',
    );

    // Wait for the card number field inside the iframe. Stripe renders a
    // `name="number"` input so label-based lookups are redundant.
    const cardNumber = cardFrame.locator('input[name="number"]');
    await cardNumber.waitFor({ state: 'visible', timeout: 15_000 });

    // 3. Fill the test card. Stripe's universal success card is 4242…4242
    //    with any future expiry, any 3-digit CVC, and any ZIP.
    await cardNumber.fill('4242 4242 4242 4242');
    await cardFrame.locator('input[name="expiry"]').fill('12 / 34');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    const postalCode = cardFrame.locator('input[name="postalCode"]');
    if (await postalCode.count()) {
      await postalCode.fill('12345');
    }

    // 4. Click the now-relabelled "Buy $25.00 of credits" submit button.
    await billing.buyCreditsContinueButton.click();

    // 5. Stripe redirects back to the billing page with a success status.
    //    `stripe.confirmPayment({ return_url: window.location.href })`
    //    preserves path + query — we only assert the key params.
    await page.waitForURL(
      new RegExp(
        `/prj/${projectSlug}/org-settings\\?(.*)redirect_status=succeeded(.*)payment_intent=pi_`,
      ),
      { timeout: 30_000 },
    );

    // 6. The page effect fires `toast(t('billing.paymentReturnProcessing'))`
    //    immediately on arrival; the balance-refresh toast ("Payment successful")
    //    fires later once `/api/billing/status` sees the balance move. We
    //    only assert the processing toast here because the success toast
    //    depends on webhook-driven balance updates, which are outside this
    //    spec's scope.
    await expect(
      page.getByText(/Payment is being processed/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
