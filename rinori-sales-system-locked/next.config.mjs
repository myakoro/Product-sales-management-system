/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable static optimization to prevent build-time database access
    // Render's Persistent Disk is not available during build phase
    experimental: {
        // Options like isrMemoryCacheSize are no longer needed or recognized in this version
    },
    // Force all routes to be dynamic
    output: 'standalone',
};

export default nextConfig;
