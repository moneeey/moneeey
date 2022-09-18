#!/bin/sh

cd /app
if [ ! -d node_modules ]; then
  echo "Installing dependencies"
  yarn install
fi
yarn dev