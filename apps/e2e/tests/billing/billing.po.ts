import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the billing surface — now served by the `org-settings`
 * shell app at `/prj/<projectSlug>/org-settings?section=billing`. The
 * standalone `/org/<slug>/billing` page was removed in RFC 0024 phase 1.
 *
 * Pair with `AuthPageObject` + `OrganizationPageObject` to get a signed-in
 * user with a fresh org before driving this one.
 *
 * Follows the same hydration-settle trick the other page objects use —
 * wait for a reference element to be visible, then give React a beat to
 * finish remounting so the first interaction doesn't race.
 */
export class BillingPageObject {
  constructor(private readonly page: Page) {}

  /** Navigate to the billing section inside the org-settings app. */
  async goto(projectSlug: string) {
    await this.page.goto(`/prj/${projectSlug}/org-settings?section=billing`);
    await this.waitForSettled(this.creditBalanceTitle);
  }

  private async waitForSettled(anchor: Locator) {
    await anchor.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500);
  }

  // ---- Credit Balance section ----------------------------------------------

  get creditBalanceTitle(): Locator {
    return this.page.getByTestId('billing-credit-balance-title');
  }

  get remainingBalanceCard(): Locator {
    return this.page.getByTestId('billing-remaining-balance');
  }

  get balanceValue(): Locator {
    return this.page.getByTestId('billing-balance-value');
  }

  get buyCreditsTrigger(): Locator {
    return this.page.getByTestId('billing-buy-credits-trigger');
  }

  get buyCreditsDialog(): Locator {
    return this.page.getByTestId('billing-buy-credits-dialog');
  }

  get buyCreditsAmountInput(): Locator {
    return this.page.getByTestId('billing-buy-credits-amount-input');
  }

  get buyCreditsTotalValue(): Locator {
    return this.page.getByTestId('billing-buy-credits-total-value');
  }

  get buyCreditsContinueButton(): Locator {
    return this.page.getByTestId('billing-buy-credits-continue-button');
  }

  /**
   * Opens the Buy credits dialog and waits for the amount input to be ready.
   * The dialog mounts asynchronously (Stripe Elements is optional, the
   * no-Stripe form renders first); the input-visible wait is the reliable
   * signal that the form has hydrated.
   */
  async openBuyCreditsDialog() {
    await this.buyCreditsTrigger.click();
    await expect(this.buyCreditsDialog).toBeVisible();
    await expect(this.buyCreditsAmountInput).toBeVisible();
  }

  // ---- Invoice history section ---------------------------------------------

  get invoiceHistoryTitle(): Locator {
    return this.page.getByTestId('billing-invoice-history-title');
  }

  get invoiceHistorySection(): Locator {
    return this.page.getByTestId('billing-invoice-history-section');
  }

  get invoiceHistoryEmptyRow(): Locator {
    return this.page.getByTestId('billing-invoice-history-empty');
  }
}
