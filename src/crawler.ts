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

export const runStaticCrawl = async (db: Db, config: Config) => {
	for (const endpoint of staticEndpoints) {
		await crawlEndpoint(db, config, endpoint);
	}
};

export const runDynamicCrawl = async (db: Db, config: Config) => {
	const observedAt = new Date().toISOString();

	for (const endpoint of dynamicEndpoints) {
		await crawlEndpoint(db, config, endpoint, observedAt);
	}
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
		console.log(JSON.stringify({ level: "info", message: "crawl ok", endpoint: endpoint.name, mode: endpoint.mode, itemCount: items.length, observedAt }));
	} catch (error) {
		await client.query("ROLLBACK").catch(() => undefined);
		await client.query("UPDATE crawl_runs SET finished_at = now(), status = 'error', error = $1 WHERE id = $2", [error instanceof Error ? error.message : String(error), crawlRunId]);
		console.error(JSON.stringify({ level: "error", message: "crawl failed", endpoint: endpoint.name, error: error instanceof Error ? error.message : String(error) }));
	} finally {
		client.release();
	}
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
