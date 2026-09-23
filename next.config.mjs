import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// Keep a production build from overwriting a running development server's cache.
export default function config(phase) {
  return { distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-production' };
}
