import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
const resolvePath = (p: string) => path.resolve(__dirname, p);

// Long-lived vendor chunks: these libraries change far less often than app
// code, so splitting them out lets browsers keep them cached across deploys.
// Only list libraries the entry (public listener page) loads anyway; anything
// forced in here is downloaded up front, so page-specific libraries such as
// recharts, d3, leaflet and individual MUI components stay with Rollup's
// default splitting and load with their lazy route.
const VENDOR_CHUNKS: Record<string, RegExp> = {
  // Rollup's CommonJS interop helper and use-sync-external-store are shared by
  // several vendor chunks; left unassigned they land in whichever chunk sees
  // them first (once it was i18n), creating a react <-> i18n import cycle that
  // leaves React undefined at startup. Every chunk already depends on react.
  react:
    /\0commonjsHelpers|node_modules\/(react|react-dom|react-router|scheduler|use-sync-external-store)\//,
  mui: /node_modules\/(@emotion|@mui\/(system|styled-engine|utils|private-theming)|@mui\/material\/styles|stylis)\//,
  apollo: /node_modules\/(@apollo|graphql|rxjs|@wry|optimism|tslib)\//,
  i18n: /node_modules\/(i18next|react-i18next|i18next-browser-languagedetector)\//,
};

const vendorChunk = (id: string) =>
  Object.keys(VENDOR_CHUNKS).find((name) => VENDOR_CHUNKS[name].test(id));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      // Proxy API calls in dev to avoid CORS preflight/OPTIONS 405 from the backend
      proxy: {
        '/graphql': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'build',
      sourcemap: true,
      rollupOptions: {
        output: { manualChunks: vendorChunk },
      },
    },
    resolve: {
      alias: {
        '@appTypes': resolvePath('src/appTypes'),
        '@libs': resolvePath('src/libs'),
        '@components': resolvePath('src/components'),
        '@routes': resolvePath('src/routes'),
        '@graphql/client': resolvePath('src/graphql/client.ts'),
        '@graphql/mutations': resolvePath('src/graphql/mutations'),
        '@graphql/queries': resolvePath('src/graphql/queries'),
        '@graphql/graphql': resolvePath('src/graphql/generated/graphql.ts'),
        '@graphql/hooks': resolvePath('src/graphql/generated/hooks.ts'),
      },
    },
  };
});
