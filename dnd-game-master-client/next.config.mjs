// The FastAPI backend (dnd-game-master-agent) origin. Override per-environment.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

// Backend route prefixes proxied through Next so the client can use a relative
// ROOT_API ("") with no CORS. Server-side proxy => browser never cross-origins.
const BACKEND_PATHS = [
  "/tools/:path*",
  "/campaigns",
  "/campaign/:path*",
  "/state/:path*",
  "/health/:path*",
  "/run",
  "/feedback",
  "/session/:path*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cover art / stills are proxied from the 5etools mirror used by the backend.
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  async rewrites() {
    return BACKEND_PATHS.map((source) => ({
      source,
      destination: `${BACKEND_ORIGIN}${source}`,
    }));
  },
};

export default nextConfig;
