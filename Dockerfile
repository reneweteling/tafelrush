# syntax=docker/dockerfile:1
# tafelrush.nl on Dokku: the Next.js website (landing, challenge links, privacy, app-link files).
# The app itself is built with EAS on the Mac, see README.

FROM node:24-bookworm-slim
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --filter web...
RUN pnpm --filter web build

ENV NODE_ENV=production
ENV TZ=Europe/Amsterdam
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["sh", "-c", "pnpm start"]
