# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app

# dev: 소스는 docker-compose.dev.yml이 /app에 bind mount, node_modules는 익명 볼륨으로 구멍
FROM base AS dev
COPY package.json package-lock.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev"]

# builder: 정적 빌드(dist/)만 만든다 — 서빙은 별도 nginx/ 서비스가 담당한다.
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
