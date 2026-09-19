# Build trong image Linux: argon2/sharp là native binary, build trên Windows không chạy được ở đây.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
# tsc chỉ compile .ts — .sql phải copy tay, thiếu là migrate chạy rỗng.
COPY src/db/migrations ./dist/db/migrations
EXPOSE 2304
# Migrate trước mỗi lần khởi động: đã chạy rồi thì migrate tự bỏ qua.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
