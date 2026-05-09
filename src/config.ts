import "dotenv/config";

export type Config = {
	accessToken: string;
	databaseUrl: string;
	crawlIntervalMs: number;
	requestTimeoutMs: number;
	runStaticOnStart: boolean;
};

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
	if (!value) return fallback;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const loadConfig = (): Config => {
	const accessToken = process.env.ACCESS_TOKEN;

	if (!accessToken) {
		throw new Error("ACCESS_TOKEN is required. Put it in .env or pass it as an environment variable.");
	}

	return {
		accessToken,
		databaseUrl: process.env.DATABASE_URL ?? "postgres://oloo:oloo@localhost:5432/oloo",
		crawlIntervalMs: parsePositiveInteger(process.env.CRAWL_INTERVAL_MS, 60_000),
		requestTimeoutMs: parsePositiveInteger(process.env.REQUEST_TIMEOUT_MS, 30_000),
		runStaticOnStart: process.env.RUN_STATIC_ON_START !== "false"
	};
};
