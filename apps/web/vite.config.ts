import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import viteReact from '@vitejs/plugin-react';
import devtoolsJson from 'vite-plugin-devtools-json';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'node:fs';
import path from 'node:path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';

import tailwindCssVitePlugin from '@guepard/tailwind-config/vite';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const gitHash = (() => {
  if (process.env.VITE_APP_GIT_HASH) return process.env.VITE_APP_GIT_HASH;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
})();

// Plugin to set correct MIME type for WASM files and extension drivers
function wasmMimeTypePlugin(): Plugin {
  return {
    name: 'wasm-mime-type',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        if (url.startsWith('/extensions/')) {
          try {
            const publicDir = path.resolve(process.cwd(), 'apps/web/public');
            const filePath = path.join(publicDir, url);

            if (url.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
            } else if (url.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (url.endsWith('.data')) {
              res.setHeader('Content-Type', 'application/octet-stream');
            } else if (url.endsWith('.json')) {
              res.setHeader('Content-Type', 'application/json');
            }
            const fileContent = fs.readFileSync(filePath);
            res.end(fileContent);
            return;
          } catch {
            // If the extension asset isn't found, fall through to Vite.
          }
        }

        // Handle WASM files with correct MIME type
        if (url.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }

        // Handle worker files with correct MIME type
        if (url.endsWith('.worker.js') || url.includes('.worker.')) {
          res.setHeader('Content-Type', 'application/javascript');
        }

        // Handle source map files
        if (url.endsWith('.map')) {
          res.setHeader('Content-Type', 'application/json');
        }

        next();
      });
    },
  };
}

function decodeDollarInRoutePathsPlugin(): Plugin {
  return {
    name: 'decode-dollar-in-route-paths',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.includes('%24')) {
          req.url = req.url.replaceAll('%24', '$');
        }
        next();
      });
    },
  };
}

// WEB_PORT is the preferred name (SDD per-worktree preview envs set it via
// .preview.env). PORT is kept as a fallback for legacy workflows and Docker.
const RAW_WEB_PORT = Number.parseInt(
  process.env.WEB_PORT ?? process.env.PORT ?? '',
  10,
);
const DEV_SERVER_PORT =
  Number.isFinite(RAW_WEB_PORT) && RAW_WEB_PORT > 0 ? RAW_WEB_PORT : 3000;
const DEV_SERVER_HOST = process.env.HOST || '0.0.0.0';

const ALLOWED_HOSTS =
  process.env.NODE_ENV === 'development'
    ? ['host.docker.internal', '.localhost', 'localhost']
    : [];

// /api proxy target: VITE_DEV_API_PROXY wins (set by .preview.env in worktrees);
// else derive from SERVER_PORT; else 4096 default.
const RAW_SERVER_PORT = Number.parseInt(process.env.SERVER_PORT ?? '', 10);
const DEV_API_PROXY_TARGET =
  process.env.VITE_DEV_API_PROXY ??
  `http://localhost:${Number.isFinite(RAW_SERVER_PORT) && RAW_SERVER_PORT > 0 ? RAW_SERVER_PORT : 4096}`;

// Polyfill require() in ESM for deps that use it (e.g. turndown -> @mixmark-io/domino)
function requirePolyfillPlugin(): Plugin {
  return {
    name: 'replace-domino-require',
    enforce: 'pre',
    transform(code, id) {
      if (!id || !id.includes('node_modules/turndown')) return null;
      const pattern = /require\(['"]@mixmark-io\/domino['"]\)/g;
      if (pattern.test(code)) {
        const replaced = code.replace(pattern, 'undefined');
        return { code: replaced, map: null };
      }
      return null;
    },
  };
}

/** TanStack Router client bootstrap can read `.length` before `matchesId` is ready. */
function tanstackMatchesIdLengthPatchPlugin(): Plugin {
  return {
    name: 'tanstack-matchesid-length-patch',
    apply: 'build',
    closeBundle() {
      const assetsDir = path.join(process.cwd(), 'dist', 'client', 'assets');
      if (!fs.existsSync(assetsDir)) return;
      // `a ?? b || c` is a SyntaxError — wrap the nullish part before `||`.
      const receiver = '([a-zA-Z_$][\\w$]*|this)';
      const steps: Array<[RegExp, string]> = [
        [
          new RegExp(
            `${receiver}\\.stores\\.matchesId\\.get\\(\\)\\?\\.length\\?\\?0(\\s*\\|\\|)`,
            'g',
          ),
          '($1.stores.matchesId.get()?.length??0)$2',
        ],
        [
          new RegExp(
            `${receiver}\\.stores\\.matchesId\\.state\\?\\.length\\?\\?0(\\s*\\|\\|)`,
            'g',
          ),
          '($1.stores.matchesId.state?.length??0)$2',
        ],
        [
          new RegExp(
            `${receiver}\\.stores\\.matchesId\\.get\\(\\)\\.length`,
            'g',
          ),
          '($1.stores.matchesId.get()?.length??0)',
        ],
        [
          new RegExp(`${receiver}\\.stores\\.matchesId\\.state\\.length`, 'g'),
          '($1.stores.matchesId.state?.length??0)',
        ],
      ];
      for (const name of fs.readdirSync(assetsDir)) {
        if (!name.endsWith('.js')) continue;
        const filePath = path.join(assetsDir, name);
        let s = fs.readFileSync(filePath, 'utf8');
        const original = s;
        for (const [re, rep] of steps) {
          s = s.replace(re, rep);
        }
        if (s !== original) {
          fs.writeFileSync(filePath, s, 'utf8');
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Populate process.env with values from .env / .env.local / .env.[mode] so
  // server-side code (TanStack Start route handlers, SSR) can read non-VITE_
  // prefixed secrets like STRIPE_SECRET_KEY. By default Vite only exposes
  // VITE_* vars via import.meta.env and never touches process.env.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }

  const skipPrerender =
    process.env.GUEPARD_SKIP_PRERENDER === '1' ||
    process.env.GUEPARD_SKIP_PRERENDER === 'true';
  const hasSupabaseSecretKey = Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const disablePrerender = skipPrerender || !hasSupabaseSecretKey;

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
      'import.meta.env.VITE_GIT_HASH': JSON.stringify(gitHash),
    },
    resolve: {
      alias: {
        '~': path.resolve(process.cwd()),
      },
      dedupe: ['i18next', 'react-i18next', 'react', 'react-dom'],
    },
    plugins: [
      tanstackStart({
        ...(disablePrerender
          ? {
              prerender: {
                // start-plugin-core always enters the prerender pipeline.
                // The only reliable way to disable it is to match zero pages.
                filter: () => false,
              },
            }
          : {}),
        // SPA shell — emits a standalone `dist/client/index.html` alongside
        // the SSR bundle so the Tauri desktop renderer can load apps/web from
        // disk (story 012). `/index` is the only outputPath that resolves to
        // a top-level `index.html` (the prerender appends `.html` to the
        // outputPath verbatim for the shell case). The cloud SSR path stays
        // untouched; this is additive.
        spa: {
          enabled: true,
          ...(skipPrerender ? {} : { prerender: { outputPath: '/index' } }),
        },
      }),
      ...(mode === 'production' ? [] : [devtools(), devtoolsJson()]),
      tailwindcss(),
      decodeDollarInRoutePathsPlugin(),
      wasmMimeTypePlugin(),
      viteReact(),
      tsconfigPaths({ ignoreConfigErrors: true }),
      wasm(),
      topLevelAwait(),
      requirePolyfillPlugin(),
      tanstackMatchesIdLengthPatchPlugin(),
      ...tailwindCssVitePlugin.plugins,
    ],
    server: {
      host: DEV_SERVER_HOST,
      port: DEV_SERVER_PORT,
      strictPort: Boolean(process.env.WEB_PORT ?? process.env.PORT),
      allowedHosts: ALLOWED_HOSTS,
      proxy: {
        // Proxy /api to apps/server when client uses relative URLs (VITE_API_URL unset)
        // Enables breadcrumb, orgs, projects, datasources etc. to load from server.
        // /api/billing/* is explicitly bypassed — those routes live inside
        // apps/web as TanStack Start server routes and must not be proxied.
        '/api': {
          target: DEV_API_PROXY_TARGET,
          changeOrigin: true,
          bypass: (req) => {
            if (
              req.url?.startsWith('/api/billing/') ||
              req.url?.startsWith('/api/docs')
            ) {
              return req.url;
            }
            return undefined;
          },
        },
      },
    },
    build: {
      // esnext skips down-compiling modern syntax. Required because
      // vite-plugin-top-level-await emits wrapper code with destructuring
      // patterns esbuild can't transform to Safari 14 (Vite's default baseline).
      target: 'esnext',
      sourcemap: false, // Disable sourcemaps to avoid resolution errors in monorepo
      manifest: true, // Enable manifest generation for React Router
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.message.includes(
              "Error when using sourcemap for reporting an error: Can't resolve original location of error.",
            )
          ) {
            return;
          }
          defaultHandler(warning);
        },
        external: (id: string) => {
          if (id === 'fsevents') return true;
          if (id === '@duckdb/node-api') return true;
          if (id.startsWith('@duckdb/node-bindings')) return true;
          if (id.includes('@duckdb/node-bindings') && id.endsWith('.node')) {
            return true;
          }
          // vega-canvas optionally requires Node's `canvas` for server-side
          // rendering; not installed and not needed here.
          if (id === 'canvas') return true;
          if (id.startsWith('node:')) return true;
          return false;
        },
        output: {
          manualChunks: (id) => {
            // Bundle ai and @ai-sdk/react together so Chat class loads before agent-ui
            if (
              id.includes('node_modules/ai/') ||
              id.includes('node_modules/@ai-sdk/react')
            ) {
              return 'ai-sdk';
            }
          },
        },
      },
    },
    optimizeDeps: {
      exclude: [
        'fsevents',
        '@electric-sql/pglite',
        '@duckdb/node-api',
        '@duckdb/duckdb-wasm',
        '@guepard/agent-factory-sdk',
        '@dqbd/tiktoken',
        '@guepard/extension-s3',
        '@guepard/extension-clickhouse-node',
        '@guepard/extension-duckdb',
        '@guepard/extension-mongodb',
        '@guepard/extension-mysql',
        '@guepard/extension-postgresql',
        '@guepard/extension-parquet-online',
        '@guepard/extension-gsheet-csv',
        '@guepard/extension-json-online',
        '@guepard/extension-youtube-data-api-v3',
      ],
      include: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/lang-sql',
        '@codemirror/theme-one-dark',
        '@uiw/react-codemirror',
        'i18next',
        'react-i18next',
        'ai',
      ],
      entries: ['./src/client.tsx', './src/router.tsx'],
      worker: {
        format: 'es',
      },
    },
  };
});
