import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// Keep a production build from overwriting a running development server's cache.
export default function config(phase) {
  // Vercel's Next.js builder expects the framework output in `.next`.
  // Keep the separate local production directory so a local build cannot
  // overwrite the cache of a running development server.
  if (process.env.VERCEL) return {};
  return { distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-production' };
}
