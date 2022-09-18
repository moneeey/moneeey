#!/bin/sh

cd /app || exit
if [ ! -d node_modules ]; then
  echo "Installing dependencies"
  yarn install
fi
INSTALL_HASH_PATH='node_modules/install_hash'
PACKAGEJSON_HASH=$(sha256sum package.json)
PREV_HASH=$(cat ${INSTALL_HASH_PATH})
if [ "${PREV_HASH}" != "${PACKAGEJSON_HASH}" ]; then
  echo "package.json changed, will 'yarn install' ${PACKAGEJSON_HASH}"
  echo "${PACKAGEJSON_HASH}" >${INSTALL_HASH_PATH}
  yarn install
fi
yarn dev
