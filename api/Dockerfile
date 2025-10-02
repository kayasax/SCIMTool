###########
# Multi-stage build for SCIMTool API (fixes local-data permission issue)
###########

# Builder stage: install deps, generate Prisma, compile TS
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
COPY public/ ./public
RUN npx prisma generate
ENV DATABASE_URL="file:./data.db"
RUN npx prisma db push
RUN npm run build
RUN npm prune --production

# Runtime stage: only production deps + dist + entrypoint
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY docker-entrypoint.sh ./

# Create non-root user and ensure writable local-data directory exists before dropping privileges
RUN addgroup -g 1001 -S nodejs \
	&& adduser -S nestjs -u 1001 \
	&& mkdir -p /app/local-data \
	&& chown -R nestjs:nodejs /app/local-data /app

USER nestjs
EXPOSE 80
CMD ["/app/docker-entrypoint.sh"]
