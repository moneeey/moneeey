import { setupMagic } from "./auth_magic.ts";
import { oak } from "./deps.ts";

export function setupAuth(_app: oak.Application, router: oak.Router) {
  const authRouter = new oak.Router();

  authRouter.get("/", ({ response }) => {
    response.body = "Welcome to Moneeey AuthAPI";
  });

  setupMagic(authRouter);

  router.use("/api/auth", authRouter.routes(), authRouter.allowedMethods());
}
