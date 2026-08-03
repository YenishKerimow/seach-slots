# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install deps first for better layer caching. The BuildKit cache mount keeps
# npm's download cache between builds, so packages are reused from disk instead
# of being re-downloaded even when this layer has to re-run.
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

# Self-heal the rolldown native binding: npm skips extracting transitive
# optional platform binaries, so ensure the one for this build arch is present.
# (glibc/gnu because this is a Debian base image.)
RUN --mount=type=cache,target=/root/.npm node -e "const {execSync}=require('child_process'); \
  const pkg='@rolldown/binding-'+({x64:'linux-x64-gnu',arm64:'linux-arm64-gnu'}[process.arch]||'linux-x64-gnu'); \
  try{require.resolve(pkg)}catch{execSync('npm install '+pkg+'@1.2.1 --no-save --ignore-scripts',{stdio:'inherit'})}"

COPY . .

# GraphQL endpoint is baked in at build time (Vite inlines VITE_* vars).
# Default targets the backend as exposed on the host by docker-compose.
ARG VITE_GRAPHQL_URL=http://localhost:3000/graphql
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
