FROM node:16.17.0-alpine
USER node
WORKDIR /app
VOLUME /app
VOLUME /app/node_modules
COPY ./entrypoint.sh /entrypoint.sh
CMD sh /entrypoint.sh
