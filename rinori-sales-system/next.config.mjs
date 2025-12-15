/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable static optimization to prevent build-time database access
    // Render's Persistent Disk is not available during build phase
    experimental: {
        isrMemoryCacheSize: 0, // Disable ISR caching
    },
    // Force all routes to be dynamic
    output: 'standalone',
};

export default nextConfig;
