# Multi-stage build for the Next.js 16 client (pnpm), producing a lean
# standalone runtime image for Cloud Run.
#
# IMPORTANT: BACKEND_ORIGIN is baked at BUILD time. Next.js evaluates
# next.config.mjs `rewrites()` during `next build` and writes the proxy
# destinations into .next/routes-manifest.json — a runtime env var does NOT
# change them. So the backend URL must be passed as a build arg (see deploy.sh /
# cloudbuild.yaml).

# ---- Builder ---------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# pnpm via corepack (version pinned by package.json "packageManager").
RUN corepack enable

# Install deps first for layer caching.
# --config.strictDepBuilds=false: pnpm 11 hard-fails a non-interactive install
# when dependencies (sharp, protobufjs, @google/genai) have unapproved build
# scripts. We don't need those native builds (the app uses plain <img>, not
# next/image), so downgrade the failure to a warning and skip them.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.strictDepBuilds=false

# Build with the backend origin baked in.
COPY . .
ARG BACKEND_ORIGIN="http://localhost:8000"
ENV BACKEND_ORIGIN=${BACKEND_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Runner ----------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind to all interfaces so Cloud Run can reach the standalone server.
ENV HOSTNAME=0.0.0.0

# Copy the standalone server + the assets it does NOT bundle automatically.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cloud Run injects PORT (8080); Next's standalone server reads process.env.PORT.
EXPOSE 8080
CMD ["node", "server.js"]
