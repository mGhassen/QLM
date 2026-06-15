import type { CookieSerializeOptions } from 'cookie-es';
import {
  parse as parseCookieHeader,
  serialize as serializeCookie,
} from 'cookie-es';

/**
 * Cookie defaults aligned with TanStack Start's `setCookie` / `getCookie`
 * (`@tanstack/react-start/server`).
 */
const defaultOptions: CookieSerializeOptions = {
  path: '/',
  sameSite: 'lax',
};

function createCookie(
  name: string,
  options: CookieSerializeOptions = defaultOptions,
) {
  return {
    parse(cookieHeader: string | null): Promise<string | undefined> {
      if (!cookieHeader) {
        return Promise.resolve(undefined);
      }
      const parsed = parseCookieHeader(cookieHeader);
      const value = parsed[name];
      if (value === undefined || value === '') {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(value);
    },
    serialize(
      value: string,
      serializeOptions?: CookieSerializeOptions,
    ): string {
      return serializeCookie(name, value, { ...options, ...serializeOptions });
    },
  };
}

export const languageCookie = createCookie('lang');
export const themeCookie = createCookie('theme');
export const layoutStyleCookie = createCookie('layout-style');
