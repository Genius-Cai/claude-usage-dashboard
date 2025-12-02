import type { NextConfig } from 'next';

/**
 * Next.js configuration
 * Configured for PWA support and production optimization
 */
const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Configure external packages for server components
  serverExternalPackages: [],

  // Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache static assets
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Service worker headers
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Manifest caching
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Empty turbopack config to use Turbopack (Next.js 16 default)
  turbopack: {},

  // Experimental features
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@tanstack/react-query',
      'recharts',
      'framer-motion',
      'lucide-react',
    ],
  },

  // Build output configuration
  output: 'standalone',

  // TypeScript configuration
  typescript: {
    // Type checking is handled by separate CI step
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
