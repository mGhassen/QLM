import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for organization flows in the post-RFC-0024 shell.
 *
 * What changed from the pre-phase-1 world:
 *   - `/organizations` is a redirect to `/prj/<slug>` (LastProjectRedirect).
 *   - `/org/<slug>` and `/org/<slug>/members` don't exist anymore — the
 *     new surface is `/prj/<slug>/org-settings?section=members|billing`,
 *     served by the `org-settings` shell app.
 *   - Create-organization lives behind the global shell topbar dropdown
 *     (`button[aria-haspopup="menu"]`). Radix renders `role="menu"` +
 *     `data-state="open"` on every open level, so we target by role +
 *     the `New organization` / `New project` labels the dropdown renders
 *     via `apps/web/src/lib/i18n/locales/en/shell.json`.
 *   - The create-org dialog (`data-test="create-organization-form"`)
 *     still takes name-only and navigates to `/` on success; the router
 *     then lands on `/prj/<newProjectSlug>` because DB triggers seed a
 *     default project for the new org.
 *
 * Pair with `AuthPageObject` — sign up + confirm a fresh user there,
 * then drive org flows here.
 */
export class OrganizationPageObject {
  constructor(private readonly page: Page) {}

  // ---- Navigation -------------------------------------------------------

  /**
   * Navigate to the members section of the org that owns `projectSlug`.
   * The shell resolves the org from the project, so we always address
   * settings surfaces by project slug.
   */
  async goToMembers(projectSlug: string) {
    await this.page.goto(`/prj/${projectSlug}/org-settings?section=members`);
    await this.waitForSettled(
      this.page.getByRole('heading', { name: /members/i }),
    );
  }

  /**
   * Same workaround `AuthPageObject.waitForAuthFormReady` uses: wait
   * for a reference element to be visible + enabled, then give React a
   * beat to finish the hydration-triggered remount. Without this the
   * first fill races with React re-rendering the form.
   */
  private async waitForSettled(anchor: Locator) {
    await anchor.waitFor({ state: 'visible' });
    await expect(anchor)
      .toBeEnabled()
      .catch(() => {
        // Headings/non-button anchors aren't 'enableable' — fall through.
      });
    await this.page.waitForTimeout(500);
  }

  // ---- Shell topbar dropdown --------------------------------------------

  /**
   * Open the global shell topbar dropdown. Uses keyboard Enter on a
   * focused trigger — the same workaround `shell-dropdown.spec.ts`
   * uses. Playwright's pointer-click fires both pointerdown (which
   * Radix uses to toggle) and a later click that Radix reads as the
   * second toggle, so click-toggle-close flickers observably.
   */
  private async openShellDropdown() {
    const trigger = this.page
      .locator('button[aria-haspopup="menu"]')
      .first();
    await expect(trigger).toBeVisible();
    if ((await trigger.getAttribute('aria-expanded')) === 'true') return;
    await trigger.focus();
    await trigger.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  }

  private level1Menu(): Locator {
    // Radix renders every open menu with role="menu" + data-state="open".
    return this.page.locator('[role="menu"][data-state="open"]').first();
  }

  private level2Menu(): Locator {
    return this.page.locator('[role="menu"][data-state="open"]').nth(1);
  }

  // ---- Create organization ---------------------------------------------

  /**
   * Open the create-organization dialog via the shell topbar dropdown's
   * `ORGANIZATION` submenu. The dropdown layout (see
   * `shell-dropdown.spec.ts`):
   *
   *   level-1 menuitems: [0]=project sub-trigger, [1]=project settings,
   *                      [2]=org sub-trigger, [3]=invite, [4]=billing,
   *                      [5]=org settings.
   */
  async openCreateOrganizationDialog() {
    // The shell topbar re-renders whenever org/project queries refetch,
    // which detaches the menuitem mid-hover. Close-and-reopen the
    // dropdown fresh on every retry so we don't chase a stale menu
    // that Radix has already torn down.
    await expect(async () => {
      await this.page.keyboard.press('Escape').catch(() => {
        /* no dropdown open — fine */
      });
      await this.openShellDropdown();
      await this.level1Menu()
        .getByRole('menuitem')
        .nth(2)
        .hover({ timeout: 2_000 });
      const submenu = this.level2Menu();
      await expect(submenu).toBeVisible({ timeout: 2_000 });
      await submenu.getByText('New organization').click({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(this.getCreateOrganizationForm()).toBeVisible();
    await expect(this.nameInput()).toBeVisible();
  }

  /**
   * Full create flow: open the dialog, type the name, submit, wait for
   * the post-create landing on `/prj/<slug>` (the shell navigates to
   * the new org's default project), and return the project slug.
   *
   * Returns the **project** slug, not the org slug — the project slug
   * is what the new settings surfaces (`/prj/<slug>/org-settings…`) key
   * off of.
   *
   * The dialog is the phase-1 `CreateOrgDialog` from
   * `packages/features/shell-topbar` — no `data-test` hooks, addressed
   * by `#create-org-name` + role-based `Create organization` button.
   */
  async createOrganization(name: string): Promise<string> {
    // Capture the active project slug *before* opening the dialog. The
    // post-create navigation takes the user to the new org's default
    // project, which has a different slug — but if we start on
    // `/prj/X` and simply wait for `/prj/<slug>`, the pattern matches
    // instantly and we never see the navigation. Wait for the slug
    // portion to change instead.
    const startSlug = this.currentProjectSlug();

    await this.openCreateOrganizationDialog();

    const nameInput = this.nameInput();
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);

    await this.submitButton().click();

    await expect
      .poll(() => this.currentProjectSlug(), { timeout: 15_000 })
      .not.toBe(startSlug);

    const slug = this.currentProjectSlug();
    if (!slug) {
      throw new Error(
        `Expected URL to contain /prj/<slug> after create, got ${this.page.url()}`,
      );
    }
    return slug;
  }

  private currentProjectSlug(): string | null {
    return /\/prj\/([^/?#]+)/.exec(this.page.url())?.[1] ?? null;
  }

  getCreateOrganizationForm(): Locator {
    return this.page.getByRole('dialog', { name: /create.*organization/i });
  }

  private nameInput(): Locator {
    return this.getCreateOrganizationForm().locator('#create-org-name');
  }

  private submitButton(): Locator {
    return this.getCreateOrganizationForm().getByRole('button', {
      name: /create organization/i,
    });
  }

  // ---- Invite members --------------------------------------------------

  async openInviteDialog() {
    await this.page.getByTestId('invite-members-trigger').click();
    await expect(this.page.getByTestId('invite-members-form')).toBeVisible();
  }

  getInviteRows(): Locator {
    return this.page.getByTestId('invite-member-form-item');
  }

  async addInviteRow() {
    await this.page.getByTestId('add-new-invite-button').click();
  }

  async removeInviteRow(rowIndex: number) {
    await this.page.getByTestId('remove-invite-button').nth(rowIndex).click();
  }

  /**
   * Fills the email and picks a role in the given invite row. Uses
   * `.nth(rowIndex)` to disambiguate when there are multiple rows.
   */
  async fillInviteRow(
    rowIndex: number,
    params: { email: string; role?: string },
  ) {
    const emailInputs = this.page.getByTestId('invite-email-input');
    const roleTriggers = this.page.getByTestId('role-selector-trigger');

    await emailInputs.nth(rowIndex).fill(params.email);
    await expect(emailInputs.nth(rowIndex)).toHaveValue(params.email);

    await roleTriggers.nth(rowIndex).click();

    if (params.role) {
      await this.page.getByTestId(`role-option-${params.role}`).click();
    } else {
      // Pick whatever the first available option is — the invite spec
      // doesn't care which role, just that a role is selected.
      await this.page.getByRole('option').first().click();
    }
  }

  async submitInvite() {
    await this.page.getByTestId('confirm-invite-members-button').click();
  }

  // ---- Members table ---------------------------------------------------

  /**
   * Looks up a member row in the members table by matching its email
   * cell. The table has no per-row `data-test`, so we scope to
   * `getByRole('row')` filtered by text content — robust against column
   * reordering.
   */
  getMemberRowByEmail(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }
}
