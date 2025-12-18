const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@engineo/shared'],
  webpack: (config) => {
    // Force resolve @engineo/shared to the source directory
    config.resolve.alias['@engineo/shared'] = path.resolve(
      __dirname,
      '../../packages/shared/src'
    );
    return config;
  },
};

module.exports = nextConfig;
