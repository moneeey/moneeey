#!/bin/sh

cd /app || exit
yarn install --immutable
yarn dev
