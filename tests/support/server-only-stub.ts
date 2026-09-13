/**
 * A no-op stand-in for `server-only` under Vitest.
 *
 * `server-only` throws on import outside a React Server Component, which is
 * exactly what it is for: it stops a client bundle pulling in a module that
 * reads the database. Under Vitest there is no bundler and no client, so the
 * package throws on every import and makes the server modules untestable.
 *
 * Aliasing it away in tests does not weaken the guarantee. The guarantee is
 * enforced by the Next.js bundler at build time, and `npm run build` is part of
 * `npm run verify` — a client component importing a server module still fails
 * the build. What this buys is the ability to assert directly on what a patient
 * payload contains, which is the single most consequential behaviour in the
 * product and the last thing that should be tested only through a rendered page.
 */
export {};
