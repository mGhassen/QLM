import type { Resource } from 'i18next';

/**
 * Eagerly bundle every locale JSON under `./locales/<lng>/<ns>.json` so the
 * first client render has resources ready — no async init window where
 * `useTranslation` would echo raw keys. `i18n.resolver.ts` stays in the
 * build for namespaces loaded after mount (currently unused, but kept as
 * the provider's `resolver` prop so future lazy namespaces still work).
 *
 * Vite transforms `import.meta.glob({ eager: true })` at build time into
 * static imports; in dev it still loads synchronously because `eager`
 * forces inlining. This runs once at module-load, not per-render.
 */

type LocaleModule = { default: Record<string, unknown> };

const modules = import.meta.glob<LocaleModule>('./locales/*/*.json', {
  eager: true,
});

export const preloadedI18nResources: Resource = (() => {
  const resources: Resource = {};
  for (const [path, mod] of Object.entries(modules)) {
    // Path shape: `./locales/en/auth.json` → language=en, namespace=auth.
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) continue;
    const [, language, namespace] = match;
    if (!language || !namespace) continue;
    resources[language] ??= {};
    resources[language][namespace] = mod.default;
  }
  return resources;
})();
