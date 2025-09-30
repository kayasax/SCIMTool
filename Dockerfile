#############################
# Optimized multi-stage build for SCIMTool
# Target: Reduce image size from 1GB+ to <400MB
#############################

#############################
# Stage 1: Build web frontend (React + Vite) - OPTIMIZED
#############################
FROM node:18-alpine AS web-build
WORKDIR /web

# Copy package files for better caching
COPY web/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY web/ ./
RUN npm run build

# Clean up build artifacts in same layer
RUN rm -rf node_modules

#############################
# Stage 2: Build API (NestJS) - OPTIMIZED
#############################
FROM node:18-alpine AS api-build
WORKDIR /app

# Install build essentials
RUN apk add --no-cache openssl

# Copy package files for better caching
COPY api/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source files
COPY api/ ./

# Copy built web assets
COPY --from=web-build /web/dist ./public

# Generate Prisma client, initialize DB, and build in optimized sequence
ENV DATABASE_URL="file:./data.db"
RUN npx prisma generate && \
    npx prisma db push && \
    npx tsc -p tsconfig.build.json

# Clean up development files and dependencies
RUN rm -rf src test *.ts tsconfig*.json && \
    npm prune --production && \
    npm cache clean --force

#############################
# Stage 3: Minimal runtime - OPTIMIZED
#############################
FROM node:18-alpine AS runtime
WORKDIR /app

# Install runtime essentials and create user in single layer
RUN apk add --no-cache openssl && \
    rm -rf /var/cache/apk/* && \
    addgroup -g 1001 -S nodejs && \
    adduser -S scim -u 1001

# Production environment
ENV NODE_ENV=production \
    PORT=80 \
    DATABASE_URL="file:./data.db" \
    NODE_OPTIONS="--max_old_space_size=384"

# Create data directory for volume mount (will be overridden if volume is mounted)
RUN mkdir -p /app/data && chown scim:nodejs /app/data

# Copy production artifacts
COPY --from=api-build --chown=scim:nodejs /app/node_modules ./node_modules
COPY --from=api-build --chown=scim:nodejs /app/dist ./dist
COPY --from=api-build --chown=scim:nodejs /app/public ./public
COPY --from=api-build --chown=scim:nodejs /app/prisma ./prisma
COPY --from=api-build --chown=scim:nodejs /app/package.json ./package.json

# Copy entrypoint script
COPY --chown=scim:nodejs api/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Clean up unnecessary files to reduce size
RUN find ./node_modules -name "*.md" -delete && \
    find ./node_modules -name "test*" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "*.map" -delete 2>/dev/null || true

USER scim
EXPOSE 80

# Optimized health check
HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=2 \
    CMD node -e "require('http').get('http://127.0.0.1:80/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["/app/docker-entrypoint.sh"]

#############################
# Build args (optional):
#   docker build --build-arg APP_VERSION=1.0.0 --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) -t <registry>/scimtool:<tag> .
# Extend NestJS to read APP_VERSION & GIT_COMMIT from env if desired.
#############################