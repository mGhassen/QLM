import { AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserToken } from '@qlm/domain/entities';
import { Alert, AlertDescription } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';

const DEFAULT_PUBLIC_API_URL = 'https://api.qlm.dev';

function getPublicApiUrl(): string {
  const fromEnv =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_QLM_PUBLIC_API_URL;
  return fromEnv && fromEnv.trim().length > 0
    ? fromEnv
    : DEFAULT_PUBLIC_API_URL;
}

export type RevealTokenViewProps = {
  row: UserToken;
  rawJwt: string;
  onClose: () => void;
};

/**
 * "reveal" pane state — the only place in the entire app where `rawJwt`
 * surfaces. The parent reducer drops `rawJwt` on `close-reveal`; this
 * component does NOT persist it anywhere (no localStorage, no
 * sessionStorage, no parent-state handoff).
 */
export function RevealTokenView({
  row,
  rawJwt,
  onClose,
}: Readonly<RevealTokenViewProps>) {
  const { t } = useTranslation('tokens');

  const curlSnippet = useMemo(
    () =>
      `curl -H "Authorization: Bearer ${rawJwt}" ${getPublicApiUrl()}/health`,
    [rawJwt],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">
          {t('pane.reveal.heading')}
        </h2>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">{row.token_name}</span>
        </p>
      </header>

      <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription>{t('pane.reveal.warning')}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raw-jwt-field">{t('pane.reveal.jwtLabel')}</Label>
        <MaskedCopyableInput
          id="raw-jwt-field"
          value={rawJwt}
          copyAriaLabel={t('pane.reveal.copyJwt')}
          copiedLabel={t('pane.reveal.copied')}
          showAriaLabel={t('pane.reveal.showJwt')}
          hideAriaLabel={t('pane.reveal.hideJwt')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="curl-snippet-field">{t('pane.reveal.curlLabel')}</Label>
        <CopyableTextarea
          id="curl-snippet-field"
          value={curlSnippet}
          copyAriaLabel={t('pane.reveal.copyCurl')}
          copiedLabel={t('pane.reveal.copied')}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>{t('pane.reveal.close')}</Button>
      </div>
    </div>
  );
}

function useCopiedFlag() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(t);
  }, [copied]);
  return { copied, markCopied: () => setCopied(true) };
}

/**
 * Token field renders masked by default (`type="password"`) so the raw
 * JWT doesn't leak to over-the-shoulder viewers or screen-capture
 * recordings. The eye toggle flips to `type="text"` on demand. Copy
 * always reads the underlying value regardless of visibility — users
 * shouldn't have to reveal the token to paste it into a CLI.
 */
function MaskedCopyableInput({
  id,
  value,
  copyAriaLabel,
  copiedLabel,
  showAriaLabel,
  hideAriaLabel,
}: Readonly<{
  id: string;
  value: string;
  copyAriaLabel: string;
  copiedLabel: string;
  showAriaLabel: string;
  hideAriaLabel: string;
}>) {
  const { copied, markCopied } = useCopiedFlag();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? hideAriaLabel : showAriaLabel;
  return (
    <div className="flex items-stretch gap-2">
      <Input
        id={id}
        readOnly
        value={value}
        type={visible ? 'text' : 'password'}
        className="font-mono text-xs"
        data-test="reveal-jwt-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={toggleLabel}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        data-test="reveal-jwt-toggle"
      >
        {visible ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">{toggleLabel}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={copyAriaLabel}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(markCopied);
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        <span className="sr-only">{copyAriaLabel}</span>
        {copied && <span className="ml-1 text-xs">{copiedLabel}</span>}
      </Button>
    </div>
  );
}

function CopyableTextarea({
  id,
  value,
  copyAriaLabel,
  copiedLabel,
}: Readonly<{
  id: string;
  value: string;
  copyAriaLabel: string;
  copiedLabel: string;
}>) {
  const { copied, markCopied } = useCopiedFlag();
  return (
    <div className="flex flex-col gap-2">
      <pre
        id={id}
        className="bg-muted overflow-x-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap"
        data-test="reveal-curl-snippet"
      >
        {value}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={copyAriaLabel}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(markCopied);
        }}
        className="self-start"
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {copied ? copiedLabel : copyAriaLabel}
      </Button>
    </div>
  );
}
