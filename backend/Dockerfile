# Multi-stage Dockerfile for NestJS API (Sen Pointage)

# 1) Builder stage: install dev deps and build TypeScript
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build

# 2) Runner stage: production image with only prod deps
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --production

# Copy built app
COPY --from=builder /app/dist ./dist

# Optional: copy any runtime config files if needed (left commented intentionally)
# COPY ./.env ./.env

EXPOSE 3000
# Use PORT env if provided by platform; default is 3000 in app config
CMD ["node", "dist/main.js"]
