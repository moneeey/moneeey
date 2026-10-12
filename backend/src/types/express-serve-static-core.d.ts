import type { Request } from "express";
import type { WebSocket } from "ws";

declare module "express-serve-static-core" {
	interface Application {
		ws(route: string, handler: (ws: WebSocket, req: Request) => void): void;
	}
}
