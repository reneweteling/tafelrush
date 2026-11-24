# syntax=docker/dockerfile:1
# tafelrush.nl on Dokku: the Next.js website (landing, challenge links, privacy, app-link files)
# plus the browser version of the game at /spelen. The phone apps are built with EAS on the Mac, see README.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
ENV EXPO_NO_TELEMETRY=1
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app

# The browser game: the Expo app exported for the web. Only its output goes to the final image.
FROM base AS spelen
COPY . .
RUN pnpm install --frozen-lockfile --filter mobile...
RUN pnpm --filter mobile export:web

FROM base
COPY . .
RUN pnpm install --frozen-lockfile --filter web...
COPY --from=spelen /app/apps/mobile/dist /app/apps/mobile/dist
RUN node apps/web/scripts/spelen.mjs
RUN pnpm --filter web build

ENV NODE_ENV=production
ENV TZ=Europe/Amsterdam
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["sh", "-c", "pnpm start"]
