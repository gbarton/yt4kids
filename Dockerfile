# TODO: dont assume build.sh was run

# FROM node:20-alpine
FROM oven/bun:latest
RUN mkdir -p /app/public
WORKDIR /app
COPY server/*.json .
RUN bun install --production
COPY server/src ./src
COPY svelte/dist ./public/
# COPY server/dist .
CMD ["bun", "run", "src/index.ts"]
EXPOSE 3000