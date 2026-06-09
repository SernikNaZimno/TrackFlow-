FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install
COPY . .
WORKDIR /app/apps/frontend
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
