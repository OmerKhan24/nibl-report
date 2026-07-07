/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow xmlrpc (server-only) - exclude from client bundle
  serverExternalPackages: ['xmlrpc'],
};

export default nextConfig;
