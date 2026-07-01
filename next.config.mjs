import { readFileSync } from 'node:fs'

// Single source of truth for the displayed version: package.json (already one of
// the required version bumps). app-version.ts reads these at runtime, so the
// in-app Version + footer can never drift from the build again. Build date is
// stamped at build time so it's always real, never a hand-edited lie.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Web "try me" demo build. `DEMO_BUILD=true npm run build` produces the public
// interactive demo: the same app, served as a website (no Tauri), under a
// subpath so it can live at chaoscommand.center/<base>/ without colliding with
// the marketing site. NEXT_PUBLIC_DEMO_MODE drives the demo banners; the
// existing demo PIN (1111) + ensureDemoSeeded already provide the data.
const DEMO = process.env.DEMO_BUILD === 'true'
// Empty/unset DEMO_BASE_PATH = ROOT-served (the subdomain, the good path — every
// /medications, /fonts, /_next path resolves correctly). A non-empty value (e.g.
// "/try") subpaths it, which only works if every link/asset is basePath-aware
// (the app's are NOT — that's why the subpath broke nav + fonts).
const DEMO_BASE = process.env.DEMO_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only subpath when a base is explicitly given; otherwise serve at root.
  ...(DEMO && DEMO_BASE ? { basePath: DEMO_BASE, assetPrefix: DEMO_BASE } : {}),
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
    NEXT_PUBLIC_DEMO_MODE: DEMO ? 'true' : 'false',
    NEXT_PUBLIC_DEMO_BASE: DEMO ? DEMO_BASE : '',
  },
  // Build configuration for Tauri desktop + mobile
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable for build
    dirs: ['app', 'components', 'lib', 'modules'], // Lint these directories
  },
  typescript: {
    ignoreBuildErrors: false, // Let's see TypeScript errors too!
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
  distDir: 'out',

  // Handle ES modules properly
  transpilePackages: ['canvas-confetti'],

  // Fix rapid reload issue on Linux - use webpack watchOptions instead
  experimental: {
    // Other experimental features can go here
  },

  // Unified webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fix hot reload infinite loop on Linux by configuring file watching
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/backend/**',
          '**/.git/**',
          '**/src-tauri/**',
          '**/out/**',
          '**/.next/**',
          '**/venv/**',
          '**/__pycache__/**',
          '**/logs/**',
          '**/*.log',
          '**/temp/**',
          '**/tmp/**'
        ],
        poll: false, // Disable polling to reduce CPU usage
        aggregateTimeout: 300, // Delay before rebuilding
      }
    }

    // Browser-only configurations
    if (!isServer) {
      // Node.js fallbacks for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      }

      // Ignore problematic modules
      config.resolve.alias = {
        ...config.resolve.alias,
        'sharp': false,
        '@img/sharp-libvips-dev/include': false,
        '@img/sharp-libvips-dev/cplusplus': false,
        '@img/sharp-wasm32/versions': false,
      }

      // Exclude problematic externals
      config.externals = config.externals || [];
      config.externals.push({
        'react-native-sqlite-storage': 'react-native-sqlite-storage',
        'better-sqlite3': 'better-sqlite3',
        'sharp': 'sharp',
      });

      // (2026-07-01) The transformers.js Sharp shim + ONNX WASM asset rule
      // lived here. Both are gone with the transformers.js stack — MedGemma
      // runs natively in the Rust process (src-tauri/src/llm.rs), so the
      // webview no longer bundles any model runtime.
    }

    // Handle ES module extensions
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js'],
    }

    return config
  },
}

export default nextConfig
