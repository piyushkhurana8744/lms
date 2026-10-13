/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  transpilePackages: [
    "@edtech/types",
    "@edtech/permissions",
    "@edtech/utils",
    "@edtech/validation"
  ],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
