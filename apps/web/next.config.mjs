/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only @leadflow/shared (zod schemas) is consumed directly. The frontend
  // never imports a database library — all DB access goes through the
  // Render API over HTTPS.
  transpilePackages: ['@leadflow/shared'],
  webpack: (config) => {
    // TypeScript NodeNext requires `.js` suffix in imports; webpack needs the
    // alias to find the corresponding `.ts` source in @leadflow/shared.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
