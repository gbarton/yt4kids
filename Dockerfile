# TODO: dont assume build.sh was run

FROM node:20-alpine
RUN mkdir -p /app
WORKDIR /app
COPY dist .
COPY *.json .
RUN npm ci
RUN npm prune --production
CMD ["node", "server.js"]
EXPOSE 3000