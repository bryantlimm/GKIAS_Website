/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add image configuration here
  images: {
    // Add the list of external domains allowed for next/image component
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Your working Firebase domain
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**', // Allow all paths from this domain
      },
      // You can add more domains here later if needed
    //   {
    //     protocol: 'https',
    //     hostname: 'picsum.photos',
    //     port: '',
    //     pathname: '/**',
    //   },
    ],
  },
};

module.exports = nextConfig;