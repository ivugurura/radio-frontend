import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
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
      '@appTypes': path.resolve(__dirname, 'src/appTypes'),
      '@libs': path.resolve(__dirname, 'src/libs'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@routes': path.resolve(__dirname, 'src/routes'),
      '@graphql/client': path.resolve(__dirname, 'src/graphql/client.ts'),
      '@graphql/mutations': path.resolve(__dirname, 'src/graphql/mutations'),
      '@graphql/queries': path.resolve(__dirname, 'src/graphql/queries'),
    },
  },
});
