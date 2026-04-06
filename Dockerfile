# Stage 1: Build frontend
FROM oven/bun:latest AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb ./
RUN bun install --frozen-lockfile
COPY frontend/ .
RUN bun run build

# Stage 2: Build server
FROM oven/bun:latest AS server-builder
WORKDIR /app
COPY server/package.json server/bun.lockb ./
RUN bun install --frozen-lockfile
COPY server/src ./src
COPY server/db ./db
COPY server/tsconfig.json server/drizzle.config.ts ./
RUN bun run build

# Stage 3: Production image
FROM oven/bun:latest
WORKDIR /app
COPY server/package.json server/bun.lockb ./
RUN bun install --production
COPY server/db ./db
COPY --from=server-builder /app/dist ./dist
COPY --from=frontend-builder /app/frontend/build ./public
CMD ["bun", "run", "dist/index.js"]
EXPOSE 3000