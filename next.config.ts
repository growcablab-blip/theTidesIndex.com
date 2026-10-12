import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Railway deploys a standalone server bundle.
  output: 'standalone',
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    // 90 for the hero and scene renders: dark gradients band and block at 75.
    qualities: [75, 90],
    formats: ['image/avif', 'image/webp'],
  },
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]);
  },
};

export default nextConfig;
