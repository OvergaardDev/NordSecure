/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent missing chunk/module errors from filesystem cache on Windows.
      config.cache = false
    }

    return config
  }
}

module.exports = nextConfig
