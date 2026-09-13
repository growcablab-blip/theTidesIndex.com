import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Each integration suite runs a real Postgres image in WebAssembly. Running
    // several files in parallel exhausts the worker heap, so suites run one at
    // a time; the wall-clock cost is small and the alternative is flakiness.
    fileParallelism: false,
    maxWorkers: 1,
    // One worker process for the whole run, rather than a fresh fork per file.
    //
    // Each suite builds a real Postgres image in WebAssembly. Spawning and
    // tearing down a fork around each one crashed a worker outright roughly once
    // per full run on Windows — exit code 0xC0000003, in a different file each
    // time, which is what distinguished it from a test failure. Reusing a single
    // process removes the repeated WASM teardown, and each suite still closes its
    // own database in `afterAll`, so nothing accumulates.
    isolate: false,
    /**
     * Shuffled order, seeded per run.
     *
     * Sharing a worker is only safe if no suite depends on what another left
     * behind, and the cheapest proof of that is to stop running them in the same
     * order every time. A suite that quietly relied on a predecessor now fails
     * within a run or two rather than on the day somebody adds a file.
     *
     * Hooks are deliberately not shuffled: `beforeAll` must still build the
     * database before `beforeEach` truncates it.
     */
    sequence: {
      shuffle: { files: true, tests: true },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./db', import.meta.url)),
      // See tests/support/server-only-stub.ts. The build still enforces it.
      'server-only': fileURLToPath(new URL('./tests/support/server-only-stub.ts', import.meta.url)),
    },
  },
});
