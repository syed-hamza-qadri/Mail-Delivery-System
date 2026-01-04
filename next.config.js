/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  // Disable styled-jsx completely
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Webpack config to disable styled-jsx
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('styled-jsx/server');
    }
    return config;
  },
};

module.exports = nextConfig;
