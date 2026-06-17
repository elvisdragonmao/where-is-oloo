import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number.parseInt(process.env.ANALYSIS_PORT ?? "3457", 10);
const host = process.env.ANALYSIS_HOST ?? "127.0.0.1";

const contentTypes = {
	".csv": "text/csv; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml; charset=utf-8",
	".webp": "image/webp"
};

const server = createServer((request, response) => {
	const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
	const pathname = decodeURIComponent(url.pathname === "/" ? "/analysis.html" : url.pathname);
	const filePath = resolve(join(root, pathname));
	const isInsideRoot = filePath === root || filePath.startsWith(`${root}/`);

	if (!isInsideRoot || !existsSync(filePath) || !statSync(filePath).isFile()) {
		response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
		response.end("Not found");
		return;
	}

	response.writeHead(200, {
		"content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
		"cache-control": "no-store"
	});
	createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
	console.log(`Open http://${host}:${port}`);
});
