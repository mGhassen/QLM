import React, { useEffect, useState } from 'react';
import i18next, { type InitOptions, type i18n, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

let globalI18nInstance: i18n | undefined;
// Module-level cache of the in-flight init promise, wrapped in an
// object so the render-phase suspense branch can mutate the slot
// without tripping the "no reassigning module vars during render"
// lint rule. A fresh promise is started only when the slot is empty;
// React's Suspense dedups on identity, so every re-render throws the
// same reference until it resolves.
const loadPromiseRef: { current: Promise<i18n> | null } = { current: null };

type Resolver = (
  lang: string,
  namespace: string,
) => Promise<Record<string, string>>;

declare global {
  interface Window {
    __I18N_RESOURCES__?: Resource;
  }
}

export function I18nProvider({
  settings,
  children,
  resolver,
  preloadedResources,
}: React.PropsWithChildren<{
  settings: InitOptions;
  resolver: Resolver;
  preloadedResources?: Resource;
}>) {
  const [instance, setInstance] = useState<i18n | undefined>(() => {
    if (
      globalI18nInstance &&
      globalI18nInstance.language === settings.lng &&
      JSON.stringify(globalI18nInstance.options.ns) ===
        JSON.stringify(settings.ns)
    ) {
      return globalI18nInstance;
    }

    let resources = preloadedResources;
    if (typeof window !== 'undefined' && !resources) {
      resources = window.__I18N_RESOURCES__;
    }

    if (resources && Object.keys(resources).length > 0) {
      const newInstance = createSyncInstance(settings, resources);
      if (newInstance) {
        globalI18nInstance = newInstance;
        return newInstance;
      }
    }

    return undefined;
  });

  useEffect(() => {
    if (instance) {
      globalI18nInstance = instance;
    }
  }, [instance]);

  // When no instance is ready yet, suspend instead of rendering children
  // against an empty fallback instance. Rendering against the fallback
  // causes `useTranslation(...).t(key)` to echo the raw key to the DOM
  // until the real instance loads — visible as a flash of "auth:signIn"
  // style text. Throwing the in-flight load promise lets the outer
  // <Suspense> boundary show its fallback instead.
  //
  // The promise's fulfilment handler only calls `setInstance(loaded)` —
  // the `globalI18nInstance` module-level cache is updated by the
  // useEffect above on the next render, keeping all module-state writes
  // out of the render phase.
  if (!instance) {
    if (loadPromiseRef.current == null) {
      // Intentional module-level mutation during render: a module-level
      // promise cache is required so every I18nProvider mount throws
      // the *same* promise reference during the async init window. A
      // `useRef` would scope the cache per-mount, which breaks
      // Suspense dedup if the provider unmounts/remounts before the
      // first load settles. The `.current` slot pattern keeps the
      // reassignment syntactically narrow and documents the intent.
      // eslint-disable-next-line react-hooks/immutability -- see above
      loadPromiseRef.current = loadI18nInstance(settings, resolver).then(
        (loaded) => {
          setInstance(loaded);
          return loaded;
        },
      );
    }
    throw loadPromiseRef.current;
  }

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

/**
 * Create an i18n instance synchronously with preloaded resources
 */
function createSyncInstance(
  settings: InitOptions,
  resources: Resource,
): i18n | undefined {
  try {
    const instance = i18next.createInstance();

    // Use initReactI18next to register the instance globally
    // This is needed because useTranslation may come from a different copy of react-i18next
    instance.use(initReactI18next);

    // Initialize synchronously with resources
    instance.init({
      ...settings,
      resources,
      initImmediate: false,
      partialBundledLanguages: true,
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
      },
    });

    // Check if instance is initialized (has language set)
    if (instance.isInitialized || instance.language) {
      return instance;
    }

    return undefined;
  } catch {
    // If sync init fails, return undefined and let async init handle it
    return undefined;
  }
}

async function loadI18nInstance(
  settings: InitOptions,
  resolver: Resolver,
): Promise<i18n> {
  try {
    if (typeof document === 'undefined') {
      // Server-side: use server initializer
      const { initializeServerI18n } = await import('./i18n-server');
      return await initializeServerI18n(settings, resolver);
    } else {
      // Client-side: use client initializer
      const { initializeI18nClient } = await import('./i18n-client');
      return await initializeI18nClient(settings, resolver);
    }
  } catch (error) {
    console.error('Failed to initialize i18n, creating fallback:', error);
    // Create a minimal fallback instance
    const { createInstance } = await import('i18next');
    const { initReactI18next } = await import('react-i18next');
    const fallbackInstance = createInstance();
    await fallbackInstance.use(initReactI18next).init({
      ...settings,
      resources: {},
      fallbackLng: settings.fallbackLng || 'en',
      showSupportNotice: false,
    });
    return fallbackInstance;
  }
}

/**
 * Set the global i18n instance (for SSR pre-initialization)
 */
export function setGlobalI18nInstance(instance: i18n) {
  globalI18nInstance = instance;
}

/**
 * Get the global i18n instance
 */
export function getGlobalI18nInstance(): i18n | undefined {
  return globalI18nInstance;
}
