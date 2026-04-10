/** @type {import('next').NextConfig} */
const nextConfig = {
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
  transpilePackages: ['canvas-confetti', '@huggingface/transformers'],

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

      // Fix transformers.js Sharp imports
      config.module.rules.push({
        test: /node_modules\/@huggingface\/transformers\/.*\.js$/,
        use: {
          loader: 'string-replace-loader',
          options: {
            search: /require\(['"]sharp['"]\)/g,
            replace: 'null',
          },
        },
      })

      // Exclude problematic externals
      config.externals = config.externals || [];
      config.externals.push({
        'react-native-sqlite-storage': 'react-native-sqlite-storage',
        'better-sqlite3': 'better-sqlite3',
        'sharp': 'sharp',
        'onnxruntime-node': 'onnxruntime-node',
      });

      // Handle WASM files for ONNX Runtime (used by Transformers.js)
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });

      // Note: Transformers.js web bundle is imported directly via path in medical-ner.ts
      // to avoid Next.js package.json exports resolving to the Node.js bundle.
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
