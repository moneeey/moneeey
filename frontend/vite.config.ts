import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		port: 4270,
		host: "0.0.0.0",
	},
	build: {
		chunkSizeWarningLimit: 32 * 1024 * 1024,
	},
	resolve: {
		alias: {
			// memdown's browser-field maps its own `./immediate.js` to
			// `./immediate-browser.js`, which then does `require('immediate')`
			// expecting to hit the top-level `immediate` npm package. esbuild's
			// prebundler collapses both paths onto the same factory name, so
			// the bare `immediate` require ends up calling
			// `require_immediate_browser()` recursively and returns `undefined`
			// — causing `setImmediate is not a function` at runtime. Forcing
			// `immediate` to an absolute file path breaks the name collision.
			immediate: path.resolve(
				__dirname,
				"node_modules/immediate/lib/index.js",
			),
		},
	},
	plugins: [
		// pouchdb-adapter-memory transitively depends on levelup, which reaches
		// into Node's `util.inherits` at require time. Without these polyfills
		// the browser bundle crashes with `inherits2 is not a function`.
		nodePolyfills({
			include: ["util", "events", "stream", "buffer", "assert"],
			globals: { Buffer: true, global: true, process: true },
		}),
		VitePWA({
			registerType: "autoUpdate",
			strategies: "generateSW",
			workbox: {
				maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
				globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf}"],
				navigateFallbackDenylist: [/^\/(api|db)\//],
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
						type: "image/svg",
						purpose: "any",
					},
					{
						src: "/favicon.144x144.svg",
						sizes: "144x144",
						type: "image/svg",
						purpose: "any",
					},
					{
						src: "/favicon.192x192.svg",
						sizes: "192x192",
						type: "image/svg",
						purpose: "any",
					},
					{
						src: "/favicon.512x512.svg",
						sizes: "512x512",
						type: "image/svg",
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
