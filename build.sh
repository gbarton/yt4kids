#!/bin/bash

set -e
set -x

rm -rf server/dist/*

cd frontend
rm -rf build/*
bun run build

# cd svelte
# rm -rf dist/*
# npm install
# pwd
# npm run build

# cd ../server
# bun install
# bun run build
# mkdir -p dist/public
# cp -r ../svelte/dist/* dist/public

cd ../

docker build -t yt4kids2:$(date '+%Y-%m-%d') -t yt4kids2:latest .
