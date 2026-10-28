# Flatmarket production image (single container: Next.js app).
# PostgreSQL and file storage are external (see docker-compose.yml).
# NOTE: this Dockerfile has not been built in the development environment
# (no Docker daemon was available); build and smoke-test it before launch.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 flatmarket
COPY --from=build --chown=flatmarket /app /app
USER flatmarket
EXPOSE 3000
# Apply pending migrations (non-destructive), then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]
