import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@unilink/dto', '@unilink/ui'],

  // Security: remove X-Powered-By header
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3011', 'localhost:8080'],
    },
  },

  // Static asset caching headers
  async headers() {
    return [
      {
        // Immutable cache for static assets (JS, CSS, images in _next/static)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Short cache for API proxy routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
