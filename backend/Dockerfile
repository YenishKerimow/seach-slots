# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

# Scraping is plain HTTP (axios) — no browser needed. ca-certificates is
# required for outbound HTTPS; dumb-init gives the app a proper init/reaper.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching. The BuildKit cache mount keeps
# npm's download cache between builds, so packages are reused from disk instead
# of being re-downloaded even when this layer has to re-run.
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

# Copy source and build.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Apply migrations, then start. dumb-init gives Chromium a proper init/reaper.
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
