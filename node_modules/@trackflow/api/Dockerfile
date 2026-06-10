# --- Stage 1: Development ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm install
COPY . .
WORKDIR /app/apps/api
CMD ["npm", "run", "dev"]

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=development /app ./
WORKDIR /app/apps/api
RUN npm run build

# --- Stage 3: Runner (Production) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
