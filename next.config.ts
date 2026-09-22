import type { NextConfig } from 'next';

/**
 * FILE47 — a design and brand services site.
 *
 * Its own repository and its own Vercel project, rooted here. There is nothing
 * to configure: the app has no dynamic route, no database and no secret to
 * hold, so it builds fully static and deploys with no environment variables of
 * any kind. See docs/BUILD.md.
 */
const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
