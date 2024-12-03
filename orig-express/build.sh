#!/bin/bash

set -e
set -x

rm -rf dist/*

cd svelte
npm install
pwd
npm run build

cd ../
npm install
npm run build
mkdir -p dist/public
cp -r svelte/dist/* dist/public

docker build -t yt4kids .
