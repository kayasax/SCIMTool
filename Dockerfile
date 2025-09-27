#############################
# Multi-stage build producing a unified SCIMTool image
# Stage 1: Build web frontend (React + Vite)
#############################
FROM node:18-alpine AS web-build
WORKDIR /web
COPY web/package*.json ./
# Ensure bash and necessary build tools (sometimes node:alpine lacks shell features) & set permissions
RUN apk add --no-cache bash
RUN npm ci --no-audit --no-fund
COPY web/ ./
# Make sure binaries are executable (occasionally git perms -> 0644)
RUN chmod -R +x node_modules/.bin || true
RUN npm run build

#############################
# Stage 2: Build API (NestJS) with pre-built web assets copied in
#############################
FROM node:18-alpine AS api-build
WORKDIR /app

# Dependencies for Prisma (openssl) & optional git if commit embedding desired
RUN apk add --no-cache openssl bash

COPY api/package*.json ./
RUN npm ci --no-audit --no-fund
COPY api/ ./

# Copy built web assets into api/public (served statically by Nest/static adapter logic if implemented)
COPY --from=web-build /web/dist ./public

# Generate Prisma client
RUN npx prisma generate

# Initialize SQLite schema (creates data.db - acceptable for lightweight use; override with volume or external DB in prod if needed)
ENV DATABASE_URL="file:./data.db"
RUN npx prisma db push

# Build API (tsc) then prune dev deps
RUN npx tsc -p tsconfig.build.json && npm prune --production

#############################
# Final runtime stage
#############################
FROM node:18-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S scim -u 1001

ENV NODE_ENV=production \
    PORT=80 \
    DATABASE_URL="file:./data.db"

# Copy built artifacts & node_modules from build stage
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/public ./public
COPY --from=api-build /app/prisma ./prisma
# SQLite file will be created at runtime on first access (data.db)
COPY api/package.json ./package.json
RUN chown -R scim:nodejs /app
USER scim
EXPOSE 80

# Health probe (simple) – override by adding proper controller if desired
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "require('http').get('http://127.0.0.1:80/health',r=>{if(r.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "dist/main.js"]

#############################
# Build args (optional):
#   docker build --build-arg APP_VERSION=1.0.0 --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) -t <registry>/scimtool:<tag> .
# Extend NestJS to read APP_VERSION & GIT_COMMIT from env if desired.
#############################