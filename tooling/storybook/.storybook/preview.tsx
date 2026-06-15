import type { Preview } from '@storybook/react';
import i18next from 'i18next';
import { ThemeProvider } from 'next-themes';
import * as React from 'react';
import { initReactI18next } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addons } from 'storybook/internal/preview-api';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { cn } from '../../../packages/ui/src/lib/utils';

import '../../../apps/web/styles/global.css';
import { ToolVariantProvider } from '../../../packages/ui/src/guepard/ai/tool-variant-context';

const localeModules = import.meta.glob(
  '../../../apps/web/src/lib/i18n/locales/en/*.json',
  { eager: true },
) as Record<string, { default: Record<string, unknown> }>;

const enResources: Record<string, Record<string, unknown>> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const ns = path.split('/').pop()!.replace('.json', '');
  enResources[ns] = mod.default;
}

if (!i18next.isInitialized) {
  await i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: enResources },
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false },
  });
}

function applyThemeClass(theme: unknown) {
  if (typeof document === 'undefined') return;
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.style.colorScheme = t;
}

if (typeof window !== 'undefined') {
  try {
    const channel = addons.getChannel();
    channel.on(GLOBALS_UPDATED, (e: any) => {
      applyThemeClass(e?.globals?.theme);
    });
  } catch {
    // ignore
  }
}

const ThemeWrapper = ({
  children,
  theme,
  fullscreen,
}: {
  children: React.ReactNode;
  theme: string;
  fullscreen?: boolean;
}) => {
  applyThemeClass(theme);
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme={theme}
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
    >
      <div
        className={cn(
          'bg-background text-foreground min-h-screen w-full',
          fullscreen ? 'p-0' : 'p-4',
        )}
      >
        {children}
      </div>
    </ThemeProvider>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const wrapper = (Story: any, context: any) => {
  const theme = context?.globals?.theme ?? 'light';
  const fullscreen = context?.parameters?.layout === 'fullscreen';
  return (
    <ThemeWrapper theme={theme} fullscreen={fullscreen}>
      <QueryClientProvider client={queryClient}>
        <ToolVariantProvider>
          <Story />
        </ToolVariantProvider>
      </QueryClientProvider>
    </ThemeWrapper>
  );
};

const decorators = [wrapper];

const preview: Preview = {
  decorators,
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Light or dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
