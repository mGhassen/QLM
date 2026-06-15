import process from 'node:process';

import type { CookieSerializeOptions } from 'cookie-es';
import {
  parse as parseCookieHeader,
  serialize as serializeCookie,
} from 'cookie-es';

function createCookie(name: string, options: CookieSerializeOptions) {
  return {
    parse(cookieHeader: string | null): Promise<string | undefined> {
      if (!cookieHeader) return Promise.resolve(undefined);
      const value = parseCookieHeader(cookieHeader)[name];
      return Promise.resolve(
        value === undefined || value === '' ? undefined : value,
      );
    },
    serialize(value: string): string {
      return serializeCookie(name, value, options);
    },
  };
}

export const csrfCookie = createCookie('_csrfSecret', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});
