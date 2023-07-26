import { setupAuth } from "./auth.ts";
import { oak } from "./deps.ts";

export async function runServer() {
  const app = new oak.Application();
  const router = new oak.Router();

  router.get("/", ({ response }) => {
    response.body = "Welcome to Moneeey API";
  });

  setupAuth(app, router);

  const port = 4269;
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.addEventListener("error", (err) => {
    console.error("application error", { err });
  });
  console.log(`Moneeey API listening at ${port}`);
  await app.listen({ port });
}
