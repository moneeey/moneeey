import react from "@vitejs/plugin-react";
import { createLogger, defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const logger = createLogger();
const originalLoggerError = logger.error.bind(logger);
logger.error = (msg, options) => {
	if (msg.includes("ECONNREFUSED") || msg.includes("http proxy error")) return;
	originalLoggerError(msg, options);
};

// https://vitejs.dev/config/
export default defineConfig({
	customLogger: logger,
	server: {
		port: 4270,
		host: "0.0.0.0",
		proxy: {
			"/api": {
				target: process.env.VITE_API_TARGET || "http://localhost:4269",
				changeOrigin: true,
				ws: true,
				configure: (proxy) => {
					proxy.on("error", (err, _req, res) => {
						if ("writeHead" in res && !res.headersSent) {
							res.writeHead(502, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ error: "backend_unavailable" }));
						}
					});
				},
			},
		},
	},
	build: {
		chunkSizeWarningLimit: 32 * 1024 * 1024,
	},
	plugins: [
		VitePWA({
			registerType: "autoUpdate",
			strategies: "generateSW",
			devOptions: {
				enabled: true,
				type: "module",
				navigateFallback: "index.html",
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
				globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf}"],
				navigateFallbackDenylist: [/^\/(api|db)\//],
				runtimeCaching: [
					{
						urlPattern: ({ url, request, sameOrigin }) =>
							sameOrigin &&
							request.method === "GET" &&
							!url.pathname.startsWith("/api/") &&
							!url.pathname.startsWith("/db/"),
						handler: "NetworkFirst",
						options: {
							cacheName: "moneeey-runtime",
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 500 },
						},
					},
				],
			},
			includeAssets: ["**/*.{js,css,html,ico,png,svg,ttf}"],
			manifest: {
				name: "Moneeey",
				short_name: "Moneeey",
				description: "Moneeey - Personal Finance Software",
				id: "/",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/favicon.svg",
						sizes: "64x64",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "/favicon.144x144.svg",
						sizes: "144x144",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "/favicon.192x192.svg",
						sizes: "192x192",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "/favicon.512x512.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "any",
					},
				],
				background_color: "#696969",
				theme_color: "#696969",
			},
		}),
		react(),
	],
	css: {
		preprocessorOptions: {
			less: {
				javascriptEnabled: true,
				additionalData: "@root-entry-name: default;",
			},
		},
	},
});
