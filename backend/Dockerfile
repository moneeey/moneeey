FROM denoland/deno:2.2
WORKDIR /app
USER deno
ADD . .
RUN deno cache main.ts

LABEL org.opencontainers.image.description=moneeey-backend
LABEL org.opencontainers.image.title=moneeey-backend

EXPOSE 4369
ENV PORT 4369

CMD ["task", "dev"]
