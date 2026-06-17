import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	build: {
		chunkSizeWarningLimit: 5000,
		emptyOutDir: true,
		outDir: "dist",
		rollupOptions: {
			input: {
				report: resolve("report/index.html")
			}
		}
	},
	publicDir: false,
	server: {
		host: "127.0.0.1",
		port: 5173
	},
	preview: {
		host: "127.0.0.1",
		port: 4173
	}
});
