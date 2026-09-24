# syntax=docker/dockerfile:1.7
# One image, two processes: `web` (default command) and `worker` (npm run worker).

FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
# postinstall runs `prisma generate` into src/generated.
RUN npm ci

FROM deps AS build
COPY . .
# Browser Sentry DSN is baked in at build time; leave empty to disable.
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN npm run build && npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/tsconfig.json /app/next.config.ts /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/assets ./assets
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts ./scripts
# The worker runs TypeScript sources directly with tsx.
COPY --from=build --chown=node:node /app/src ./src
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
