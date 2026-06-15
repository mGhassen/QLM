import { expect, type Locator, type Page } from '@playwright/test';

import { expectNoApiCall } from '../utils/expect-no-api-call';
import { Mailbox } from '../utils/mailbox';

/**
 * Page object for all password-based auth flows — sign-up, email
 * confirmation via Mailpit, sign-in, sign-out, password reset, and
 * update-password. Keeps the specs readable and the selectors in one
 * place so UI changes have a single update site.
 */
export class AuthPageObject {
  private readonly mailbox: Mailbox;

  constructor(private readonly page: Page) {
    this.mailbox = new Mailbox(page);
  }

  // ---- Navigation -------------------------------------------------------

  async goToSignIn() {
    await this.page.goto('/auth/sign-in');
    await this.waitForAuthFormReady();
  }

  async goToSignUp() {
    await this.page.goto('/auth/sign-up');
    await this.waitForAuthFormReady();
  }

  async goToPasswordReset() {
    await this.page.goto('/auth/password-reset');
    await this.waitForAuthFormReady();
  }

  /**
   * The auth pages hydrate asynchronously (Vite SSR + React 19). A naive
   * `fill → click` races with the post-hydration remount: inputs get
   * typed into the pre-hydration DOM, then react-hook-form mounts and
   * re-applies its empty `defaultValues`, overwriting the native DOM
   * value with `''`. Submit then validates an empty form and silently
   * fails (no network call, no visible error — the empty-string
   * validation message isn't surfaced). `networkidle` is unusable here
   * because Vite's HMR socket keeps the network busy forever.
   *
   * We wait for the submit button to be enabled (lower bound on "form
   * mounted"). Callers use `fillStable` to keep re-filling until the
   * value sticks past any RHF re-render.
   *
   * Public because some flows land on an auth form without using one of
   * the `goTo*` helpers — e.g. the Mailpit recovery link drops the user
   * straight onto `/update-password`, so the caller needs to settle the
   * form itself before filling.
   */
  async waitForAuthFormReady() {
    const submit = this.page.getByTestId('auth-submit-button');
    await submit.waitFor({ state: 'visible' });
    await expect(submit).toBeEnabled();
    await this.page.waitForTimeout(500);
  }

  /**
   * Re-fill the input until the value is observed as stable — defeats
   * the RHF `defaultValues` re-render that wipes values filled before
   * RHF finishes mounting. `pressSequentially` dispatches per-keystroke
   * `input` events so RHF's `field.onChange` fires naturally, which is
   * more reliable than `fill`'s single synthetic input event when the
   * page is still settling.
   */
  private async fillStable(locator: Locator, value: string) {
    await expect(async () => {
      await locator.fill('');
      await locator.pressSequentially(value, { delay: 20 });
      await expect(locator).toHaveValue(value, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
  }

  // ---- Sign-in / Sign-up / Sign-out -------------------------------------

  async signIn(params: { email: string; password: string }) {
    await this.fillStable(this.page.getByTestId('email-input'), params.email);
    await this.fillStable(
      this.page.getByTestId('password-input'),
      params.password,
    );
    await this.page.getByTestId('auth-submit-button').click();
  }

  async signUp(params: { email: string; password: string }) {
    const emailInput = this.page.getByTestId('email-input');
    const passwordInput = this.page.getByTestId('password-input');
    const repeatInput = this.page.getByTestId('repeat-password-input');

    // Poll-retry the fill→submit cycle until the form transitions: we
    // either see the success alert, an auth-error alert, or the URL
    // changes. If an earlier click consumed into a silent RHF
    // validation failure (hydration race wiped the values before
    // handleSubmit read them), the outer toPass() retries from scratch.
    const successAlert = this.page.getByTestId('email-confirmation-alert');
    const errorAlert = this.page.getByTestId('auth-error-message');
    const startUrl = this.page.url();

    await expect(async () => {
      await this.fillStable(emailInput, params.email);
      await this.fillStable(passwordInput, params.password);
      await this.fillStable(repeatInput, params.password);

      await this.page.getByTestId('auth-submit-button').click();

      await this.page.waitForTimeout(400);
      const [successCount, errorCount] = await Promise.all([
        successAlert.count(),
        errorAlert.count(),
      ]);
      const urlChanged = this.page.url() !== startUrl;
      if (successCount === 0 && errorCount === 0 && !urlChanged) {
        throw new Error('sign-up submit produced no outcome — retrying');
      }
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Waits for the "check your email" alert that the sign-up container
   * shows after a successful submission. Signals that Supabase has queued
   * the confirmation email and it is safe to poll Mailpit.
   */
  async waitForEmailConfirmationPrompt() {
    await expect(
      this.page.getByTestId('email-confirmation-alert'),
    ).toBeVisible();
  }

  /**
   * Polls Mailpit for the freshly-queued confirmation email, extracts
   * the verification link, and follows it. Retries until the email is
   * available — Supabase sends asynchronously.
   */
  async confirmEmail(email: string) {
    await expect(async () => {
      await this.mailbox.visitConfirmLinkFor(email);
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Opens the sidebar profile menu and clicks "Log Out". Assumes the
   * user is currently signed in and on a page that renders the global
   * shell (e.g. `/prj/<slug>`). Targets `ShellUserProfileMenu` via the
   * stable `data-test="shell-user-menu-trigger"` hook (added by RFC
   * 0025 story 006 — the legacy `getByRole({name: /@/})` heuristic
   * stops matching once the topbar shows `accounts.name` instead of
   * the raw email). The Log Out item is a Radix `DropdownMenuItem`
   * (role=menuitem) addressed by its visible label.
   */
  async signOut() {
    const trigger = this.page.getByTestId('shell-user-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await trigger.focus();
    await trigger.press('Enter');
    await this.page
      .getByRole('menuitem', { name: /log out/i })
      .click();
  }

  // ---- Password reset ---------------------------------------------------

  /**
   * Submits the password-reset request form and waits for the success
   * alert to confirm the email has been queued.
   */
  async requestPasswordReset(email: string) {
    await this.fillStable(this.page.getByTestId('email-input'), email);
    await this.page.getByTestId('auth-submit-button').click();
    await expect(
      this.page.getByTestId('password-reset-success-alert'),
    ).toBeVisible();
  }

  /**
   * Fills and submits the `/update-password` form. The caller should
   * have already navigated to the page (typically via `confirmEmail`
   * following the Mailpit recovery link). On success the form
   * navigates to `pathsConfig.app.home` (= `/`) which
   * `LastProjectRedirect` resolves to `/prj/<slug>`.
   */
  async setNewPassword(password: string) {
    // Recovery link drops us straight here, so we're outside of the
    // `goTo*` helpers that normally handle the hydration wait.
    await this.waitForAuthFormReady();

    await this.fillStable(
      this.page.getByTestId('password-input'),
      password,
    );
    await this.fillStable(
      this.page.getByTestId('repeat-password-input'),
      password,
    );

    await this.page.getByTestId('auth-submit-button').click();
  }

  // ---- Assertion helpers ------------------------------------------------

  /**
   * Locator for the server-side error banner rendered by
   * `AuthErrorAlert` after a failed Supabase auth call.
   */
  getAuthErrorMessage(): Locator {
    return this.page.getByTestId('auth-error-message');
  }

  /**
   * Delegates to the shared `expectNoApiCall` helper. Kept as a method
   * so existing auth specs don't have to change — new specs should
   * import the helper directly from `tests/utils/expect-no-api-call`.
   */
  async expectNoAuthApiCall<T>(
    endpointGlob: string,
    action: () => Promise<T>,
  ): Promise<T> {
    return expectNoApiCall(this.page, endpointGlob, action);
  }
}
