'use client';

import { useEffect } from 'react';

/**
 * The last boundary: the root layout itself failed.
 *
 * This replaces the whole document, so it has to render its own `html` and
 * `body` and cannot rely on the layout, the fonts or any provider. It is styled
 * inline for that reason — a stylesheet that failed to load is one of the ways
 * to get here.
 *
 * It says less than the other boundaries on purpose. At this point nothing about
 * the application can be trusted to be working, so it makes exactly one promise:
 * reloading is safe.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error('Root layout failed to render', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fbfcfa',
          color: '#0b1f2a',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        <main style={{ margin: '0 auto', maxWidth: '38rem', padding: '4rem 1.5rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#1f6b73',
            }}
          >
            The Tides Index
          </p>
          <h1 style={{ margin: '0.75rem 0 0', fontSize: '1.875rem', lineHeight: 1.2 }}>
            The site could not be loaded.
          </h1>
          <p style={{ margin: '1rem 0 0', color: '#5d6b72', lineHeight: 1.6 }}>
            This is a fault at our end. Nothing you were reading has been changed or withdrawn, and
            reloading is safe.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              border: 0,
              borderRadius: '0.375rem',
              backgroundColor: '#123f4a',
              color: '#fbfcfa',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
