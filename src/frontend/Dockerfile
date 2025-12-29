# Multi-stage build for Next.js frontend
# Target: production, development

# ============================================
# Base Stage: Common Node.js setup
# ============================================
FROM node:20.11-alpine as base

# Metadata
LABEL maintainer="claude-code@example.com"
LABEL description="Claude Code Frontend - Next.js UI"
LABEL version="1.0"

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Create non-root user with home directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -h /home/nextjs && \
    mkdir -p /home/nextjs/.npm && \
    chown -R nextjs:nodejs /home/nextjs

# ============================================
# Dependencies Stage: Install Node modules
# ============================================
FROM base as dependencies

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Builder Stage: Build Next.js application
# ============================================
FROM base as builder

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# ============================================
# Development Stage: Full development setup
# ============================================
FROM base as development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Development command
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# ============================================
# Production Stage: Optimized production image
# ============================================
FROM base as production

# Set production environment
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Production command
CMD ["npm", "start"]
