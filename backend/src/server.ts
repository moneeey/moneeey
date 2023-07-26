import { setupAuth } from "./auth.ts";
import { PORT } from "./config.ts";
import { oak } from "./deps.ts";

export async function runServer() {
  const app = new oak.Application();
  const router = new oak.Router();

  router.get("/", ({ response }) => {
    response.body = "Welcome to Moneeey API";
  });

  setupAuth(app, router);

  const port = PORT;
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.addEventListener("error", (err) => {
    console.error("application error", { err });
  });
  console.log(`Moneeey API listening at ${port}`);
  await app.listen({ port });
}
