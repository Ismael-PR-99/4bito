# ── Stage 1: Build Angular ────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# ── Stage 2: Build API ────────────────────────────────────
FROM node:20-alpine AS api-builder
WORKDIR /api
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY api/ .
RUN npm run build

# ── Stage 3: Production ───────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# API dist + deps
COPY --from=api-builder /api/dist        ./dist
COPY --from=api-builder /api/node_modules ./node_modules
COPY --from=api-builder /api/package.json ./

# Angular browser build
COPY --from=frontend /app/dist/4bito/browser ./public

# SQL migrations (run automatically on first boot)
COPY 4bito-api/db/migrations/ ./migrations/

EXPOSE 3000
CMD ["node", "dist/index.js"]
