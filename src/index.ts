import { loadConfig } from "./config.js";
import { runDynamicCrawl, runStaticCrawl } from "./crawler.js";
import { createDb, migrate } from "./db.js";

const config = loadConfig();
const db = createDb(config);

let dynamicCrawlRunning = false;

const runDynamicCrawlSafely = async () => {
	if (dynamicCrawlRunning) {
		console.warn(JSON.stringify({ level: "warn", message: "skip dynamic crawl because previous cycle is still running" }));
		return;
	}

	dynamicCrawlRunning = true;
	try {
		await runDynamicCrawl(db, config);
	} finally {
		dynamicCrawlRunning = false;
	}
};

const shutdown = async (signal: string) => {
	console.log(JSON.stringify({ level: "info", message: "shutdown", signal }));
	await db.end();
	process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.log(JSON.stringify({ level: "info", message: "starting crawler", crawlIntervalMs: config.crawlIntervalMs }));
await migrate(db);
console.log(JSON.stringify({ level: "info", message: "database migration complete" }));

if (config.runStaticOnStart) {
	await runStaticCrawl(db, config);
}

await runDynamicCrawlSafely();
setInterval(() => void runDynamicCrawlSafely(), config.crawlIntervalMs);
