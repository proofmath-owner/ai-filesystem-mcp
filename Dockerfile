# AI FileSystem MCP - Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Build the application
RUN npm run build

# Prune to production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Stage 2: Runtime stage
FROM node:20-alpine AS runtime

# Install security updates and useful tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    git \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp

# Set working directory
WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/package*.json ./

# Copy essential files
COPY --chown=mcp:mcp README.md LICENSE ./

# Create directories for runtime data
RUN mkdir -p /app/data /app/logs /app/cache && \
    chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Set environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3000
ENV MCP_HOST=0.0.0.0
ENV MCP_DATA_DIR=/app/data
ENV MCP_LOG_DIR=/app/logs
ENV MCP_CACHE_DIR=/app/cache

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${MCP_PORT}/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Metadata
LABEL maintainer="AI FileSystem MCP Team"
LABEL version="2.0.0"
LABEL description="AI-optimized Model Context Protocol server for intelligent file system operations"
LABEL org.opencontainers.image.title="AI FileSystem MCP"
LABEL org.opencontainers.image.description="MCP server with 39 commands for file system management"
LABEL org.opencontainers.image.url="https://github.com/your-org/ai-filesystem-mcp"
LABEL org.opencontainers.image.documentation="https://ai-filesystem-mcp.dev"
LABEL org.opencontainers.image.source="https://github.com/your-org/ai-filesystem-mcp"
LABEL org.opencontainers.image.vendor="AI FileSystem MCP Team"
LABEL org.opencontainers.image.licenses="MIT"