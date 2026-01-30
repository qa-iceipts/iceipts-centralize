# Stage 1: Builder
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (only production dependencies for cleaner image initially, but we need devDeps for build if any)
# Since there is no build step for this express app (no typescript/babel transpilation visible), we can just install deps.
# However, usually good practice to copy package files first.
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies (in case they are needed for some scripts, though usually for prod only prod deps are needed)
# Using 'npm ci' for deterministic builds
RUN npm ci

# Copy the rest of the application code
COPY . .

# Stage 2: Runner
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install only production dependencies to keep image small
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code from builder (or directly if no build step, but multi-stage allows filtering files)
# In this case, since we don't have a 'dist' folder, we copy source files.
# We are copying from source directly in this stage to avoid carrying over dev-specific artifacts if we had them.
# For a simple JS app, we could just copy from context, but let's stick to the plan of a clean runner.
COPY . .

# Create a non-root user and switch to it for security
# Alpine comes with a 'node' user
USER node

# Expose the application port
EXPOSE 5000

# Healthcheck to ensure the service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "server.js"]
