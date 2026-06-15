import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the Profile section under `/prj/{slug}/user-settings`.
 * Selectors target `data-test` attributes added by RFC 0025 story 006 —
 * never translated copy, so the spec stays robust to i18n churn.
 *
 * Navigates via the topbar trigger (`shell-user-menu-trigger`) → Settings
 * dropdown item → user-settings route → Profile sidebar item. The legacy
 * `UserTokensPageObject.openSettingsDialog()` ends with a tokens-specific
 * `pane-state-list` assertion that doesn't hold after RFC 0025 made
 * Profile the default sidebar item, so we replicate the navigation here.
 */
export class UserProfilePageObject {
  constructor(private readonly page: Page) {}

  // ---- Navigation -------------------------------------------------------

  /**
   * Opens user-settings via the topbar dropdown and selects the Profile
   * sidebar item. Asserts the Name card is mounted before returning so
   * the caller can rely on Profile cards being interactive.
   */
  async goToProfile(): Promise<void> {
    const trigger = this.page.getByTestId('shell-user-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await trigger.focus();
    await trigger.press('Enter');
    await this.page.getByTestId('shell-account-dropdown-settings').click();
    await this.page.waitForURL(/\/prj\/[^/]+\/user-settings/, {
      timeout: 10_000,
    });
    // Profile is the default sidebar selection post-RFC-0025; explicitly
    // click it to be resilient to URL-restored state from a previous visit.
    await this.page
      .getByRole('button', { name: /^Profile$/ })
      .first()
      .click();
    await expect(this.page.getByTestId('name-card')).toBeVisible();
  }

  // ---- Name card --------------------------------------------------------

  nameInput(): Locator {
    return this.page.getByTestId('name-input');
  }

  async setName(value: string): Promise<void> {
    const input = this.nameInput();
    await input.fill('');
    await input.fill(value);
  }

  async submitName(): Promise<void> {
    await this.page.getByTestId('name-submit').click();
  }

  async expectNameError(): Promise<void> {
    await expect(this.page.getByTestId('name-error')).toBeVisible();
  }

  /**
   * Reads the topbar avatar trigger label. Used to assert that updates
   * to `accounts.name` propagate without reload (story 001's resolution
   * for spec §1 open question #1).
   */
  async expectTopbarName(name: string): Promise<void> {
    await expect(
      this.page.getByTestId('shell-user-menu-trigger'),
    ).toContainText(name);
  }

  // ---- Picture card -----------------------------------------------------

  pictureInput(): Locator {
    return this.page.getByTestId('picture-input');
  }

  async uploadAvatar(filepath: string): Promise<void> {
    await this.pictureInput().setInputFiles(filepath);
  }

  async clickClearAvatar(): Promise<void> {
    await this.page.getByTestId('picture-clear').click();
  }

  async expectAvatarVisible(): Promise<void> {
    await expect(this.page.getByTestId('picture-clear')).toBeVisible();
  }

  async expectAvatarCleared(): Promise<void> {
    await expect(this.page.getByTestId('picture-clear')).toHaveCount(0);
  }

  async expectPictureError(): Promise<void> {
    await expect(this.page.getByTestId('picture-error')).toBeVisible();
  }

  // ---- Password card ----------------------------------------------------

  async setPassword(input: {
    current: string;
    next: string;
    confirm: string;
  }): Promise<void> {
    await this.page.getByTestId('password-current').fill(input.current);
    await this.page.getByTestId('password-next').fill(input.next);
    await this.page.getByTestId('password-confirm').fill(input.confirm);
  }

  async submitPassword(): Promise<void> {
    await this.page.getByTestId('password-submit').click();
  }

  async expectPasswordCurrentError(): Promise<void> {
    await expect(this.page.getByTestId('password-current-error')).toBeVisible();
  }

  async expectPasswordNextError(): Promise<void> {
    await expect(this.page.getByTestId('password-next-error')).toBeVisible();
  }

  async expectPasswordNotLinkedBanner(): Promise<void> {
    await expect(
      this.page.getByTestId('password-not-linked-banner'),
    ).toBeVisible();
  }
}
