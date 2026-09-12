# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/api-contract/package.json packages/api-contract/package.json

RUN pnpm --version \
  && pnpm install --frozen-lockfile \
    --filter . \
    --filter "@sanskrit-shloka-learning/api..."

COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/
COPY apps/api/src apps/api/src
COPY packages/api-contract/tsconfig.json packages/api-contract/tsconfig.build.json packages/api-contract/
COPY packages/api-contract/src packages/api-contract/src
COPY packages/api-contract/generated packages/api-contract/generated

RUN pnpm --filter "@sanskrit-shloka-learning/api..." build \
  && pnpm --filter @sanskrit-shloka-learning/api --prod deploy /opt/api \
  && rm /opt/api/pnpm-lock.yaml /opt/api/pnpm-workspace.yaml

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production PORT=8080

WORKDIR /app

COPY --from=build /opt/api/ ./
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint

USER node

EXPOSE 8080

ENTRYPOINT ["api-entrypoint"]
