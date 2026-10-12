declare module "express-ws" {
	function expressWs<T>(app: T): { app: T };

	export default expressWs;
}
