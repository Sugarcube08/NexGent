/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    turbopack: {},
    webpack: (config) => {
        config.resolve.fallback = { fs: false, os: false, path: false };
        return config;
    },
    // Proxy /api requests to the FastAPI backend in the mono-container
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://127.0.0.1:8000/:path*',
            },
        ];
    },
};

export default nextConfig;
