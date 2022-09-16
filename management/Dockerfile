FROM node:16.17.0-alpine
WORKDIR /app
COPY package.json package.json
RUN yarn install
VOLUME /app
CMD yarn start
