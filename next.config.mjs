/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['sql.js'],
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/student.html',
        destination: '/student',
        permanent: true,
      },
      {
        source: '/teacher.html',
        destination: '/teacher',
        permanent: true,
      },
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
