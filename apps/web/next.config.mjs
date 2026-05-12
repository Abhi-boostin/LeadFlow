/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages compiled in-process. @prisma/client stays external (binary deps).
  transpilePackages: ['@leadflow/shared', '@leadflow/db'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  webpack: (config) => {
    // Allow `import './foo.js'` to resolve to `./foo.ts` for the transpiled workspace
    // packages. TypeScript NodeNext mandates the .js suffix in source but webpack
    // doesn't know the .ts mapping by default.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
