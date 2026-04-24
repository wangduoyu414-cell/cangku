import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    exclude: ['packages/**/node_modules/**', 'packages/**/dist/**', 'packages/core/src/fingerprint/*.test.ts'],
  },
  resolve: {
    alias: {
      '@creator-os/anticrawl/proxy': resolve(__dirname, 'packages/anticrawl/src/proxy/index.ts'),
    },
  },
});
