FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/agents/package.json ./packages/agents/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile --filter @devfoundry/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/agents/node_modules ./packages/agents/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY packages/agents ./packages/agents
COPY packages/api ./packages/api
RUN pnpm --filter @devfoundry/agents build
RUN pnpm --filter @devfoundry/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/agents/dist ./packages/agents/dist
COPY --from=builder /app/packages/agents/package.json ./packages/agents/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

EXPOSE 3000
CMD ["node", "packages/api/dist/main.js"]
