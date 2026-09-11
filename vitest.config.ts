import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Each integration suite runs a real Postgres image in WebAssembly. Running
    // several files in parallel exhausts the worker heap, so suites run one at
    // a time; the wall-clock cost is small and the alternative is flakiness.
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./db', import.meta.url)),
    },
  },
});
