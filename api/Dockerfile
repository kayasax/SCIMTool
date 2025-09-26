# Build API server with pre-built web client
FROM node:18-alpine

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Copy pre-built web client
COPY public/ ./public

# Generate Prisma client first
RUN npx prisma generate

# Initialize SQLite database schema
ENV DATABASE_URL="file:./data.db"
RUN npx prisma db push

# Build the application
RUN npx tsc -p tsconfig.build.json

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port 80 (as specified in environment variables)
EXPOSE 80

# Start the application
CMD ["npm", "run", "start"]