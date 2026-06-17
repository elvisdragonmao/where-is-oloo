FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/crawler/package.json ./apps/crawler/package.json
RUN pnpm install --frozen-lockfile --filter @where-is-oloo/crawler...

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/crawler/node_modules ./apps/crawler/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY apps/crawler ./apps/crawler
RUN pnpm --filter @where-is-oloo/crawler build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/apps/crawler
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY apps/crawler/package.json /app/apps/crawler/package.json
RUN cd /app && pnpm install --prod --frozen-lockfile --filter @where-is-oloo/crawler...
COPY --from=build /app/apps/crawler/dist ./dist
COPY apps/crawler/dashboard.html ./dashboard.html
EXPOSE 3456
CMD ["pnpm", "start"]
