import { expect, type Page } from '@playwright/test';

/**
 * Page object for the post-AM-1 token-management flow. Every selector
 * uses `data-test` attributes shipped by RFC 0009 stories — no string
 * matching against translated copy, so the spec stays robust to copy
 * changes.
 *
 * Flow shape (matches spec §10.4):
 *   account dropdown → Settings → dialog opens with TokensSettingsPane in
 *   the `list` pane-state → Generate → `create` → submit → `reveal` →
 *   close → `list` → trash → `revoke-confirm` → confirm → `list`.
 */
export class UserTokensPageObject {
  constructor(private readonly page: Page) {}

  // ---- Settings dialog entry point -------------------------------------

  /**
   * Opens the sidebar profile dropdown and clicks Settings.
   *
   * Post-RFC-0024 the profile trigger lives inside `ShellUserProfileMenu`;
   * since RFC 0025 story 006 it carries a stable
   * `data-test="shell-user-menu-trigger"` hook (the legacy
   * `getByRole({name: /@/})` heuristic stops matching once the topbar
   * shows `accounts.name` instead of the raw email).
   *
   * Since the "User settings as a shell app" migration (story 010
   * carve-out), clicking Settings navigates the user to
   * `/prj/<slug>/user-settings`. Post-RFC-0025 the default sidebar item
   * is Profile, not Tokens — so we explicitly click "Personal tokens"
   * before asserting the `pane-state-list` marker rendered by
   * `TokensSettingsPane`.
   *
   * The method name is kept for backwards-compat with existing callers;
   * "dialog" is a historical artifact.
   */
  async openSettingsDialog() {
    const trigger = this.page.getByTestId('shell-user-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await trigger.focus();
    await trigger.press('Enter');
    await this.page.getByTestId('shell-account-dropdown-settings').click();
    await this.page.waitForURL(/\/prj\/[^/]+\/user-settings/, {
      timeout: 10_000,
    });
    await this.page
      .getByRole('button', { name: /^Personal tokens$/ })
      .first()
      .click();
    await expect(this.page.getByTestId('pane-state-list')).toBeVisible();
  }

  // ---- Pane-state assertions -------------------------------------------

  async expectPaneState(
    kind: 'list' | 'create' | 'reveal' | 'revoke-confirm',
  ) {
    await expect(this.page.getByTestId(`pane-state-${kind}`)).toBeVisible();
  }

  // ---- list → create ---------------------------------------------------

  /**
   * Triggers the create flow. Uses the toolbar Generate button when rows
   * exist; falls back to the empty-state CTA when the list is empty.
   */
  async startCreateFlow() {
    const toolbarButton = this.page.getByTestId('token-list-generate');
    const emptyButton = this.page.getByTestId('token-list-empty');
    if (await toolbarButton.isVisible().catch(() => false)) {
      await toolbarButton.click();
    } else if (await emptyButton.isVisible().catch(() => false)) {
      // Empty state ships its own CTA inside the empty block — click the
      // button labelled by the i18n key `tokens:empty.action`.
      await emptyButton.getByRole('button').click();
    } else {
      throw new Error('No Generate Token entry point visible.');
    }
    await this.expectPaneState('create');
  }

  // ---- create form -----------------------------------------------------

  async fillTokenForm(input: {
    name: string;
    scopes: ReadonlyArray<'read' | 'write' | 'admin'>;
  }) {
    await this.page.getByLabel('Token Name').fill(input.name);
    for (const scope of input.scopes) {
      const label = scope.charAt(0).toUpperCase() + scope.slice(1);
      await this.page.getByRole('checkbox', { name: label }).click();
    }
  }

  async submitCreateForm() {
    const submit = this.page.getByTestId('generate-token-submit');
    await expect(submit).toBeEnabled();
    await submit.click();
    await this.expectPaneState('reveal');
  }

  // ---- reveal ----------------------------------------------------------

  async getRevealedJwt(): Promise<string> {
    const input = this.page.getByTestId('reveal-jwt-input');
    return input.inputValue();
  }

  async clickCopyJwt() {
    await this.page.getByRole('button', { name: 'Copy token' }).click();
  }

  async closeRevealView() {
    // Scope the "Close" lookup to the reveal pane — the surrounding
    // `<SettingsDialog>` also exposes a "Close settings" X button and the
    // unqualified role lookup is ambiguous.
    await this.page
      .getByTestId('pane-state-reveal')
      .getByRole('button', { name: 'Close' })
      .click();
    await this.expectPaneState('list');
  }

  // ---- list → revoke-confirm ------------------------------------------

  /**
   * Reads the row containing the given token name and clicks its trash
   * icon. Assumes a single row matches the name (token names are unique
   * per account in practice).
   */
  async revokeRow(tokenName: string) {
    const row = this.page
      .getByTestId('token-list-content')
      .getByRole('row')
      .filter({ hasText: tokenName });
    await row.getByRole('button', { name: 'Revoke token' }).click();
    await this.expectPaneState('revoke-confirm');
  }

  async confirmRevoke() {
    const submit = this.page.getByTestId('revoke-confirm-submit');
    await expect(submit).toBeEnabled();
    await submit.click();
    await this.expectPaneState('list');
  }

  // ---- list-row assertions --------------------------------------------

  /**
   * Asserts a row with the given name is visible in the list AND its
   * status / scopes match the expected values. Status comes from the
   * `tokens:status.*` i18n keys; scopes come from `tokens:scopes.*`.
   */
  async assertRowVisible(
    name: string,
    expected: {
      status: 'Active' | 'Expired' | 'Revoked';
      scopes: ReadonlyArray<'Read' | 'Write' | 'Admin'>;
    },
  ) {
    const row = this.page
      .getByTestId('token-list-content')
      .getByRole('row')
      .filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(expected.status);
    for (const scope of expected.scopes) {
      await expect(row).toContainText(scope);
    }
  }
}
