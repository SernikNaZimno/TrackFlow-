# --- Stage 1: Development ---
FROM node:20-bullseye-slim AS development
WORKDIR /app
# Zależności systemowe dla Puppeteer w systemach Linux
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates procps libxss1 \
    libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/worker/package.json ./apps/worker/
RUN npm install

# Instalacja przeglądarki Chrome dla Puppeteera
RUN npx puppeteer browsers install chrome

COPY . .
WORKDIR /app/apps/worker
CMD ["npm", "run", "dev"]

# --- Stage 2: Builder ---
FROM development AS builder
WORKDIR /app/apps/worker
RUN npm run build

# --- Stage 3: Runner (Production) ---
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Instalacja zależności systemowych dla produkcji
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates procps libxss1 \
    libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
WORKDIR /app/apps/worker
CMD ["npm", "run", "start"]
