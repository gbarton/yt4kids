# TODO: dont assume build.sh was run

# FROM node:20-alpine
FROM oven/bun:latest
RUN mkdir -p /app
WORKDIR /app
COPY server/dist .
COPY server/*.json .
RUN bun install --production
CMD ["bun", "run", "index.js"]
EXPOSE 3000