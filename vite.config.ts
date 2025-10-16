import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
const resolvePath = (p: string) => path.resolve(__dirname, p);
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
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
      '@graphql/hooks': resolvePath('src/graphql/generated/hooks.ts'),
    },
  },
});
