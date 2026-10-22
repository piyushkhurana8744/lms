/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Standalone output produces a minimal self-contained server bundle.
  // Required by the multi-stage Dockerfile.
  output: 'standalone',

  eslint: {
    ignoreDuringBuilds: true,
  },

  transpilePackages: [
    '@edtech/types',
    '@edtech/permissions',
    '@edtech/utils',
    '@edtech/validation',
  ],

  async rewrites() {
    // In production the nginx gateway routes /api/v1/* directly to the API
    // container, so NEXT_PUBLIC_API_URL is intentionally left empty.
    // In local dev, set NEXT_PUBLIC_API_URL=http://localhost:4000.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiUrl) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
