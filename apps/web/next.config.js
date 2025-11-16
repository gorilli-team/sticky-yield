/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: shared package transpilation removed for Vercel deployment
  // If shared package is needed, deploy from root with monorepo config
};

module.exports = nextConfig;
