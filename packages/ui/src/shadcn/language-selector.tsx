'use client';

import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export type LanguageSelectorProps = {
  /**
   * Supported language codes. Defaults to whatever `i18next.options.supportedLngs`
   * exposes, so callers don't have to pass anything if they configured i18n
   * properly in app settings.
   */
  languages?: readonly string[];
  /**
   * Display labels keyed by code (e.g. `{ en: 'English', fr: 'Français' }`).
   * Falls back to `Intl.DisplayNames` localised in the current language.
   */
  labels?: Record<string, string>;
  /**
   * Cookie name used to persist the choice across reloads. Defaults to `lang`
   * to match `I18N_COOKIE_NAME` used by the web app's i18n boot.
   */
  cookieName?: string;
  className?: string;
};

const DEFAULT_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
};

function resolveLabel(
  code: string,
  currentLanguage: string,
  labels?: Record<string, string>,
): string {
  if (labels?.[code]) return labels[code]!;
  if (DEFAULT_LABELS[code]) return DEFAULT_LABELS[code]!;
  // Intl.DisplayNames renders the language in the currently-selected language
  // (so the dropdown reads natively when you switch).
  try {
    const dn = new Intl.DisplayNames([currentLanguage], { type: 'language' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

/**
 * Dropdown that switches the app's active i18n language and persists the
 * choice in a cookie so SSR / next page load picks it up. Reads the
 * supported language list from `i18n.options.supportedLngs` by default —
 * callers can override via the `languages` prop. Hides itself when only
 * one language is configured (no point showing a single-option select).
 */
export function LanguageSelector({
  languages,
  labels,
  cookieName = 'lang',
  className,
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const supported =
    languages ??
    (Array.isArray(i18n.options.supportedLngs)
      ? (i18n.options.supportedLngs.filter(
          (v): v is string => typeof v === 'string' && v !== 'cimode',
        ) as readonly string[])
      : ([i18n.language] as readonly string[]));

  if (supported.length <= 1) return null;

  const current = i18n.language;

  const handleChange = (next: string) => {
    writeCookie(cookieName, next);
    void i18n.changeLanguage(next);
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supported.map((code) => (
          <SelectItem key={code} value={code}>
            {resolveLabel(code, current, labels)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
