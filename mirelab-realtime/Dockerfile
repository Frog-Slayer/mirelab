# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app

# dev: 소스는 docker-compose.dev.yml이 /app에 bind mount, node_modules는 익명 볼륨으로 구멍
FROM base AS dev
COPY package.json package-lock.json ./
RUN npm ci
EXPOSE 1234
CMD ["npm", "run", "dev"]

# builder: tsc 빌드
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# prod: 런타임 의존성만 새로 설치하고 빌드 산출물만 실행 (완전히 무상태 — 볼륨 불필요)
FROM base AS prod
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 1234
USER node
CMD ["node", "dist/server.js"]
