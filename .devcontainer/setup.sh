#!/bin/sh

mkdir -p \
  /workspace/docker/backend_node_modules_data \
  /workspace/docker/frontend_node_modules_data \
  /workspace/docker/couchdb_data \
  /workspace/frontend/node_modules \
  /workspace/backend/node_modules

sudo chown node:node \
  /workspace/docker/*node_modules_data \
  /workspace/frontend/node_modules \
  /workspace/backend/node_modules
