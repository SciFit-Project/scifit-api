FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN groupadd -r --gid 1001 nodejs && useradd -r -g nodejs --uid 1001 nodejs
USER nodejs

EXPOSE 8080

CMD ["npm", "start"]
