# Multi-stage Dockerfile for Playwright Agent
# Build context should be parent directory: docker build -f agent/Dockerfile .
# This allows access to both agent/ and shared/ directories
# Stage 1: Build TypeScript
FROM node:20 AS builder

# Set working directory to match agent structure
WORKDIR /app

# Copy agent package files to current directory
COPY agent/package*.json ./
COPY agent/tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy agent source code (will be at /app/src)
COPY agent/src ./src

# Copy shared types to ../shared (relative to /app)
# Agent imports from '../../shared/types', so from /app/src:
# ../../shared/types -> /shared/types (parent of /app is /, so /shared/types)
# But TypeScript needs files under rootDir, so we'll use a different approach:
# Copy shared to a location TypeScript can access during build
# We'll copy to /app/../shared which is /shared (same as original path)
RUN mkdir -p /shared
COPY shared /shared

# Build TypeScript without rootDir constraint for Docker
# Remove rootDir temporarily to allow imports from /shared
RUN sed -i 's/"rootDir": "\.\/src",//' tsconfig.json && npm run build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Install Playwright Chromium and system dependencies
# This is required for Chromium to run in Docker
RUN apt-get update && \
    apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy agent package files for Playwright installation
COPY agent/package*.json ./

# Install only production dependencies
RUN npm ci --production

# Install Playwright Chromium only (not Firefox/WebKit)
RUN npx playwright install chromium --with-deps

# Copy built files from builder stage
# When rootDir is removed, output structure is /app/dist/app/src/
# Copy from /app/dist/app/src to ./dist to get the correct structure
COPY --from=builder /app/dist/app/src ./dist

# Copy shared types to /shared (needed at runtime for require() resolution)
# Compiled JS files import from '../../shared/types', so from /app/dist, 
# it resolves to /shared/types
RUN mkdir -p /shared
COPY --from=builder /shared /shared

# Set environment variable to indicate Docker mode
ENV DOCKER=true
ENV FORCE_CHROMIUM=true

# Default command - starts the agent
CMD ["node", "dist/index.js"]

