export interface ISecretVault {
  /**
   * Encrypts or stores a secret value.
   * Returns a protected string (e.g., "enc:..." or "vault:...")
   */
  protect(
    value: string,
    context: { keyName: string; datasourceId?: string },
  ): Promise<string>;

  /**
   * Decrypts or retrieves a secret value from its protected form.
   */
  reveal(protectedValue: string): Promise<string>;

  /**
   * Helper to identify if a value is protected by this vault.
   */
  isProtected(value: string): boolean;

  /**
   * Best-effort deletion of a previously-protected value. Optional because
   * some backing stores (e.g. append-only vaults) do not support deletion;
   * callers should treat failures as non-fatal and log a warning.
   *
   * Used by integration deletion and credential rotation so secrets do not
   * linger in the vault after the row that referenced them is gone.
   */
  forget?(protectedValue: string): Promise<void>;
}
