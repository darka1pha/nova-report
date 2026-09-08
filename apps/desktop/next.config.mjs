/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@report/schema',
    '@report/expression',
    '@report/data',
    '@report/layout',
    '@report/pagination',
    '@report/core',
    '@report/exporter',
    '@report/exporter-pdf',
    '@report/exporter-docx',
    '@report/exporter-xlsx',
    '@report/exporter-html',
    '@report/engine',
    '@report/react'
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        child_process: false,
        crypto: false,
        os: false,
        net: false,
        tls: false,
        zlib: false
      };
    }
    return config;
  }
};

export default nextConfig;
