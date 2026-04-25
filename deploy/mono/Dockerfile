# Shoujiki Mono-Container (Professional Monorepo Structure)
# This container runs Redis, API, Worker, Sandbox, and serves Web (standalone)

# Phase 1: Frontend Builder
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ .
# Set API URL to relative /api for the mono-container proxy
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# Phase 2: Final Runner
FROM python:3.11-slim AS runner

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    supervisor \
    redis-server \
    util-linux \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup API & Worker
WORKDIR /app/api
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/ ./backend/
RUN touch ./backend/__init__.py

# Setup Sandbox
WORKDIR /app/sandbox
COPY apps/sandbox/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/sandbox/ .

# Setup Web (Standalone)
WORKDIR /app/web
# Next.js standalone needs specific folder structure to serve static files
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public

# Supervisor configuration
WORKDIR /app
RUN mkdir -p /var/log/supervisor
COPY deploy/mono/supervisord.conf /etc/supervisor/supervisord.conf

# Expose ONLY the UI port to Render (Force routing to Next.js)
# Next.js will proxy /api to the FastAPI app on 8000 internally
EXPOSE 3000

# Force supervisor to use the explicit config and stay in foreground
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
