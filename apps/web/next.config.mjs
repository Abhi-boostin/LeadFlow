/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages compiled in-process. @prisma/client stays external (binary deps).
  transpilePackages: ['@leadflow/shared', '@leadflow/db'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
