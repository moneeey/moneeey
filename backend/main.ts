import { createServer, runServer } from "./src/server.ts";

if (import.meta.main) {
	runServer(createServer());
}
