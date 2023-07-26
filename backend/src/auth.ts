import { setupMagic } from "./auth_magic.ts";
import { oak } from "./deps.ts";

export function setupAuth(_app: oak.Application, router: oak.Router) {
  const authRouter = new oak.Router();

  setupMagic(authRouter);

  router.use("/auth", authRouter.routes(), authRouter.allowedMethods());
}
