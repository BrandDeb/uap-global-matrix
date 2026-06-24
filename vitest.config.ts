import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig `@/*` → `./src/*` path alias.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
