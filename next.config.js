/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  eslint: {
    // Disable ESLint during builds to avoid configuration issues
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;