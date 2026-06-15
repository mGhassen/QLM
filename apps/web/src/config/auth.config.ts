import { z } from 'zod';

import type { Provider } from '@supabase/supabase-js';

const ProviderSchema = z.enum([
  'apple',
  'azure',
  'bitbucket',
  'discord',
  'facebook',
  'figma',
  'github',
  'gitlab',
  'google',
  'kakao',
  'keycloak',
  'linkedin',
  'linkedin_oidc',
  'notion',
  'slack',
  'slack_oidc',
  'spotify',
  'twitch',
  'twitter',
  'workos',
  'zoom',
]);

const AuthConfigSchema = z.object({
  providers: z.object({
    password: z.boolean(),
    magicLink: z.boolean(),
    oAuth: z.array(ProviderSchema),
  }),
  captchaTokenSiteKey: z.string().optional(),
  displayTermsCheckbox: z.boolean(),
});

const rawOAuth =
  import.meta.env.VITE_AUTH_OAUTH_PROVIDERS?.split(',')
    .map((p: string) => p.trim())
    .filter(Boolean) ?? [];

const oauthParsed = z.array(ProviderSchema).safeParse(rawOAuth);
const oAuth: Provider[] = oauthParsed.success
  ? oauthParsed.data
  : (['google'] as Provider[]);

const authConfig = AuthConfigSchema.parse({
  providers: {
    password: true,
    magicLink: false,
    oAuth,
  },
  captchaTokenSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
  displayTermsCheckbox: false,
});

export default authConfig;
