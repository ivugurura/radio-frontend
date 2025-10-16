import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
const resolvePath = (p: string) => path.resolve(__dirname, p);
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
