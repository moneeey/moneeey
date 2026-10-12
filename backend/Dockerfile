FROM node:22.14-bookworm
WORKDIR /app
ADD . .
RUN yarn install --immutable

LABEL org.opencontainers.image.description=moneeey-backend
LABEL org.opencontainers.image.title=moneeey-backend

EXPOSE 4369
ENV PORT 4369

CMD ["yarn", "dev"]
