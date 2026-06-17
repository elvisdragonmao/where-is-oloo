import type { Config } from "./config.js";
import type { Db } from "./db.js";
import { insertRows } from "./db.js";
import type { EndpointDefinition } from "./endpoints.js";
import { dynamicEndpoints, staticEndpoints } from "./endpoints.js";
import { insertNormalizedObservations } from "./normalizers.js";
import { getSourceId, parseTimestamp, toItems } from "./utils.js";

type FetchResult = {
	status: number;
	payload: unknown;
};

type CrawlOutcome = {
	endpoint: string;
	mode: EndpointDefinition["mode"];
	status: "ok" | "error";
	itemCount: number;
	observedAt: string;
	finishedAt: string;
	error?: string;
};

export const runStaticCrawl = async (db: Db, config: Config) => {
	const outcomes: CrawlOutcome[] = [];

	for (const endpoint of staticEndpoints) {
		outcomes.push(await crawlEndpoint(db, config, endpoint));
	}

	logCrawlSummary("static crawl cycle finished", outcomes);
};

export const runDynamicCrawl = async (db: Db, config: Config) => {
	const observedAt = new Date().toISOString();
	const outcomes: CrawlOutcome[] = [];

	for (const endpoint of dynamicEndpoints) {
		outcomes.push(await crawlEndpoint(db, config, endpoint, observedAt));
	}

	logCrawlSummary("dynamic crawl cycle finished", outcomes);
};

const crawlEndpoint = async (db: Db, config: Config, endpoint: EndpointDefinition, observedAt = new Date().toISOString()) => {
	const client = await db.connect();
	const runResult = await client.query<{ id: string }>("INSERT INTO crawl_runs (endpoint_name, mode) VALUES ($1, $2) RETURNING id", [endpoint.name, endpoint.mode]);
	const crawlRunId = Number.parseInt(runResult.rows[0].id, 10);

	try {
		const result = await fetchJson(endpoint, config);
		const items = toItems(result.payload);

		await client.query("BEGIN");

		if (endpoint.mode === "static") {
			await upsertStaticItems(client, endpoint.name, observedAt, items);
		} else {
			await insertRawObservations(client, endpoint.name, observedAt, crawlRunId, items);
			await insertNormalizedObservations(client, endpoint.name, observedAt, crawlRunId, items);
		}

		await client.query("UPDATE crawl_runs SET finished_at = now(), status = 'ok', http_status = $1, item_count = $2 WHERE id = $3", [result.status, items.length, crawlRunId]);
		await client.query("COMMIT");

		const finishedAt = new Date().toISOString();
		const outcome = { endpoint: endpoint.name, mode: endpoint.mode, status: "ok" as const, itemCount: items.length, observedAt, finishedAt };
		console.log(JSON.stringify({ level: "info", message: "crawl ok", ...outcome }));
		return outcome;
	} catch (error) {
		await client.query("ROLLBACK").catch(() => undefined);
		const errorMessage = error instanceof Error ? error.message : String(error);
		await client.query("UPDATE crawl_runs SET finished_at = now(), status = 'error', error = $1 WHERE id = $2", [errorMessage, crawlRunId]);

		const finishedAt = new Date().toISOString();
		const outcome = { endpoint: endpoint.name, mode: endpoint.mode, status: "error" as const, itemCount: 0, observedAt, finishedAt, error: errorMessage };
		console.error(JSON.stringify({ level: "error", message: "crawl failed", ...outcome }));
		return outcome;
	} finally {
		client.release();
	}
};

const logCrawlSummary = (message: string, outcomes: CrawlOutcome[]) => {
	const okOutcomes = outcomes.filter(outcome => outcome.status === "ok");
	const lastSuccessfulCrawlAt = okOutcomes.at(-1)?.finishedAt ?? null;

	console.log(
		JSON.stringify({
			level: "info",
			message,
			endpointCount: outcomes.length,
			okEndpointCount: okOutcomes.length,
			failedEndpointCount: outcomes.length - okOutcomes.length,
			totalItemCount: okOutcomes.reduce((sum, outcome) => sum + outcome.itemCount, 0),
			lastSuccessfulCrawlAt
		})
	);
};

const fetchJson = async (endpoint: EndpointDefinition, config: Config): Promise<FetchResult> => {
	const url = new URL(endpoint.url);
	url.searchParams.set("access_token", config.accessToken);

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

	try {
		const response = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: controller.signal
		});

		const text = await response.text();

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
		}

		return {
			status: response.status,
			payload: text.length > 0 ? JSON.parse(text) : null
		};
	} finally {
		clearTimeout(timeout);
	}
};

const insertRawObservations = async (client: Parameters<typeof insertRows>[0], endpointName: string, observedAt: string, crawlRunId: number, items: ReturnType<typeof toItems>) => {
	await insertRows(
		client,
		"raw_endpoint_observations",
		["observed_at", "endpoint_name", "source_id", "source_updated_at", "payload", "crawl_run_id"],
		items.map(item => [observedAt, endpointName, getSourceId(item, endpointName), parseTimestamp(item.updatedAt), JSON.stringify(item), crawlRunId])
	);
};

const upsertStaticItems = async (client: Parameters<typeof insertRows>[0], endpointName: string, fetchedAt: string, items: ReturnType<typeof toItems>) => {
	if (items.length === 0) return;

	for (const item of items) {
		await client.query(
			`
INSERT INTO static_endpoint_items (endpoint_name, source_id, fetched_at, source_updated_at, payload)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (endpoint_name, source_id) DO UPDATE SET
	fetched_at = EXCLUDED.fetched_at,
	source_updated_at = EXCLUDED.source_updated_at,
	payload = EXCLUDED.payload
`,
			[endpointName, getSourceId(item, endpointName), fetchedAt, parseTimestamp(item.updatedAt), JSON.stringify(item)]
		);
	}
};
