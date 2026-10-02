/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting is run separately (npm run lint); keep production builds deterministic.
  eslint: { ignoreDuringBuilds: true },
  // Browser Use + LLM calls are made client-side from the user's browser using
  // keys stored in localStorage (visamotion_config). Keep the app frontend-first.
};

export default nextConfig;
