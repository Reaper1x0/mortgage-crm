FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# Use node directly — cross-env is dev-only and not installed in production image.
CMD ["node", "./src/bin/www.js"]
