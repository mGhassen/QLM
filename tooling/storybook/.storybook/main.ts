import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  // Same static root as Next.js `apps/web/public` so `/images/oauth/*` etc. resolve in stories.
  staticDirs: [{ from: '../../../apps/web/public', to: '/' }],
  stories: [
    '../../../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../../../packages/features/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../../../packages/apps/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        react(),
        wasm(),
        topLevelAwait(),
        tsconfigPaths(),
        tailwindcss(),
      ],
      define: {
        // `@qlm/billing` parses Stripe env at module-top level. Storybook
        // doesn't load `apps/web/.env.local`, so inject a placeholder that
        // satisfies the `pk_` prefix refinement.
        'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(
          'pk_test_storybook_placeholder',
        ),
      },
      esbuild: {
        jsx: 'automatic',
      },
      ssr: {
        external: [
          '@duckdb/node-api',
          '@duckdb/node-bindings-win32-x64',
          '@duckdb/node-bindings-darwin-x64',
          '@duckdb/node-bindings-linux-x64',
        ],
      },
      build: {
        rollupOptions: {
          external: (id: string) => {
            if (id === '@duckdb/node-api') return true;
            if (id.startsWith('@duckdb/node-bindings')) return true;
            if (id.startsWith('node:')) return true;
            return false;
          },
        },
      },
      optimizeDeps: {
        exclude: [
          '@duckdb/node-api',
          '@duckdb/node-bindings-win32-x64',
          '@duckdb/node-bindings-darwin-x64',
          '@duckdb/node-bindings-linux-x64',
          '@qlm/extension-clickhouse-node',
          '@qlm/extension-clickhouse-web',
          '@qlm/extension-duckdb',
          '@qlm/extension-duckdb-wasm',
          '@qlm/extension-pglite',
          '@qlm/extension-mysql',
          '@qlm/extension-postgresql',
          '@qlm/extension-json-online',
          '@qlm/extension-gsheet-csv',
          '@qlm/extension-parquet-online',
          '@qlm/extension-youtube-data-api-v3',
        ],
      },
    });
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};

export default config;
