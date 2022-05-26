FROM node:18.2.0-alpine
WORKDIR /app
COPY package.json package.json
RUN yarn install
VOLUME /app
CMD yarn start