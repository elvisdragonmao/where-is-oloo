import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sshHost = process.env.REPORT_DATA_SSH_HOST ?? "emfox";
const remoteDir = process.env.REPORT_DATA_REMOTE_DIR ?? "~/where-is-oloo";
const dbContainer = process.env.REPORT_DATA_DB_CONTAINER ?? "where-is-oloo-db-1";
const statusConcurrency = Number.parseInt(process.env.REPORT_DATA_STATUS_CONCURRENCY ?? "2", 10);
const outputPath = resolve(process.argv[2] ?? "src/report-data.generated.json");
const remotePsqlCommand = `cd ${remoteDir} && docker exec -i ${dbContainer} psql -U oloo -d oloo -X -q -t -A -v ON_ERROR_STOP=1`;

const psql = sql => {
	const result = spawnSync("ssh", [sshHost, remotePsqlCommand], {
		encoding: "utf8",
		input: sql,
		maxBuffer: 1024 * 1024 * 80
	});

	if (result.status !== 0) {
		throw new Error(`remote psql failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
	}

	const text = result.stdout.trim();
	if (!text) return null;
	return JSON.parse(text);
};

const psqlAsync = sql =>
	new Promise((resolveResult, reject) => {
		const child = spawn("ssh", [sshHost, remotePsqlCommand], {
			stdio: ["pipe", "pipe", "pipe"]
		});
		let stdout = "";
		let stderr = "";

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", chunk => {
			stdout += chunk;
		});
		child.stderr.on("data", chunk => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", code => {
			if (code !== 0) {
				reject(new Error(`remote psql failed with exit code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
				return;
			}

			const text = stdout.trim();
			resolveResult(text ? JSON.parse(text) : null);
		});

		child.stdin.end(sql);
	});

const runWithConcurrency = async (items, concurrency, worker) => {
	const results = new Array(items.length);
	let nextIndex = 0;
	const workerCount = Math.max(1, Math.min(concurrency, items.length));

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const index = nextIndex;
				nextIndex += 1;
				results[index] = await worker(items[index], index);
			}
		})
	);

	return results;
};

const baseCtes = `
SET statement_timeout = '1200s';
WITH station_meta AS (
	SELECT
		source_id::integer AS station_id,
		payload->>'name' AS station_name,
		payload->>'stationNumber' AS station_number,
		CASE
			WHEN payload->>'stationNumber' ILIKE 'NTHU%' OR payload->>'name' LIKE '%清大%' THEN '清大'
			WHEN payload->>'stationNumber' ILIKE 'NCTU%' OR payload->>'name' LIKE '%交大%' THEN '交大'
			ELSE '其他'
		END AS campus
	FROM static_endpoint_items
	WHERE endpoint_name = 'scooter-rental-stations-active-stations'
		AND source_id ~ '^[0-9]+$'
),
station_15m AS (
	SELECT
		time_bucket('15 minutes', c.observed_at) AS bucket,
		timezone('Asia/Taipei', time_bucket('15 minutes', c.observed_at)) AS local_bucket,
		c.station_id,
		m.station_name,
		m.station_number,
		m.campus,
		avg(c.scooter_count)::double precision AS total_avg,
		avg(c.available_scooter_count)::double precision AS available_avg,
		avg(c.rented_scooter_count)::double precision AS rented_avg
	FROM station_scooter_counts c
	JOIN station_meta m ON m.station_id = c.station_id
	WHERE m.campus IN ('清大', '交大')
	GROUP BY 1, 2, 3, 4, 5, 6
),
station_1m AS (
	SELECT
		time_bucket('1 minute', c.observed_at) AS bucket,
		timezone('Asia/Taipei', time_bucket('1 minute', c.observed_at)) AS local_bucket,
		c.station_id,
		m.station_name,
		m.campus,
		avg(c.scooter_count)::double precision AS total_avg,
		avg(c.available_scooter_count)::double precision AS available_avg
	FROM station_scooter_counts c
	JOIN station_meta m ON m.station_id = c.station_id
	WHERE m.campus IN ('清大', '交大')
	GROUP BY 1, 2, 3, 4, 5
)
`;

const stationSql = `
${baseCtes},
metadata AS (
	SELECT
		min(bucket) AS data_start_utc,
		max(bucket) AS data_end_utc,
		min(local_bucket) AS data_start_at,
		max(local_bucket) AS data_end_at,
		count(*) AS station_windows,
		count(DISTINCT station_id) AS station_count
	FROM station_15m
),
campus_hour_bucket AS (
	SELECT
		campus,
		local_bucket,
		extract(hour FROM local_bucket)::integer AS hour,
		sum(total_avg)::double precision AS total_avg,
		sum(available_avg)::double precision AS available_avg,
		avg((available_avg <= 0)::integer)::double precision * 100 AS shortage_rate,
		avg((available_avg < 3)::integer)::double precision * 100 AS low_stock_rate
	FROM station_15m
	GROUP BY 1, 2, 3
),
campus_hour AS (
	SELECT
		campus,
		hour,
		avg(total_avg)::double precision AS total_avg,
		avg(available_avg)::double precision AS available_avg,
		avg(shortage_rate)::double precision AS shortage_rate,
		avg(low_stock_rate)::double precision AS low_stock_rate
	FROM campus_hour_bucket
	GROUP BY 1, 2
),
weekday_hour AS (
	SELECT
		CASE extract(isodow FROM local_bucket)::integer
			WHEN 1 THEN '星期一'
			WHEN 2 THEN '星期二'
			WHEN 3 THEN '星期三'
			WHEN 4 THEN '星期四'
			WHEN 5 THEN '星期五'
			WHEN 6 THEN '星期六'
			ELSE '星期日'
		END AS weekday,
		extract(isodow FROM local_bucket)::integer AS isodow,
		campus,
		extract(hour FROM local_bucket)::integer AS hour,
		avg(total_avg)::double precision AS total_avg,
		avg(available_avg)::double precision AS available_avg,
		avg((available_avg <= 0)::integer)::double precision * 100 AS shortage_rate,
		avg((available_avg < 3)::integer)::double precision * 100 AS low_stock_rate
	FROM station_15m
	GROUP BY 1, 2, 3, 4
),
daily_strategy_bucket AS (
	SELECT
		'每日整體' AS scope,
		campus,
		local_bucket,
		extract(hour FROM local_bucket)::integer AS hour,
		sum(total_avg)::double precision AS total_avg,
		sum(available_avg)::double precision AS available_avg,
		avg((available_avg <= 0)::integer)::double precision * 100 AS shortage_rate,
		avg((available_avg < 3)::integer)::double precision * 100 AS low_stock_rate
	FROM station_15m
	GROUP BY 1, 2, 3, 4
	UNION ALL
	SELECT
		CASE extract(isodow FROM local_bucket)::integer WHEN 1 THEN '星期一' ELSE '星期五' END AS scope,
		campus,
		local_bucket,
		extract(hour FROM local_bucket)::integer AS hour,
		sum(total_avg)::double precision AS total_avg,
		sum(available_avg)::double precision AS available_avg,
		avg((available_avg <= 0)::integer)::double precision * 100 AS shortage_rate,
		avg((available_avg < 3)::integer)::double precision * 100 AS low_stock_rate
	FROM station_15m
	WHERE extract(isodow FROM local_bucket)::integer IN (1, 5)
	GROUP BY 1, 2, 3, 4
),
daily_strategy AS (
	SELECT
		scope,
		campus,
		hour,
		avg(total_avg)::double precision AS total_avg,
		avg(available_avg)::double precision AS available_avg,
		avg(shortage_rate)::double precision AS shortage_rate,
		avg(low_stock_rate)::double precision AS low_stock_rate
	FROM daily_strategy_bucket
	GROUP BY 1, 2, 3
),
station_risk AS (
	SELECT
		station_id,
		station_name,
		campus,
		count(*) AS windows,
		avg((available_avg <= 0)::integer)::double precision * 100 AS shortage_rate,
		avg((available_avg <= 0 AND total_avg <= 0)::integer)::double precision * 100 AS empty_station_rate,
		avg((available_avg <= 0 AND total_avg > 0)::integer)::double precision * 100 AS unavailable_with_vehicle_rate,
		avg((available_avg < 3)::integer)::double precision * 100 AS low_stock_rate,
		avg(available_avg)::double precision AS available_avg,
		avg(total_avg)::double precision AS total_avg
	FROM station_15m
	GROUP BY 1, 2, 3
	ORDER BY shortage_rate DESC, low_stock_rate DESC
	LIMIT 10
)
SELECT jsonb_pretty(jsonb_build_object(
	'metadata', (SELECT to_jsonb(metadata) FROM metadata),
	'campusHour', (SELECT jsonb_agg(to_jsonb(campus_hour) ORDER BY campus, hour) FROM campus_hour),
	'weekdayHour', (SELECT jsonb_agg(to_jsonb(weekday_hour) ORDER BY isodow, campus, hour) FROM weekday_hour),
	'dailyStrategy', (SELECT jsonb_agg(to_jsonb(daily_strategy) ORDER BY scope, campus, hour) FROM daily_strategy),
	'stationRisk', (SELECT jsonb_agg(to_jsonb(station_risk) ORDER BY shortage_rate DESC, low_stock_rate DESC) FROM station_risk)
));
`;

const statusRangesSql = `
SELECT jsonb_pretty(jsonb_agg(jsonb_build_object(
	'startIso', range_start::timestamptz,
	'endIso', range_end::timestamptz,
	'chunkName', chunk_name
) ORDER BY range_start))
FROM timescaledb_information.chunks
WHERE hypertable_name = 'scooter_status_observations';
`;

const statusSignalSqlForRange = (startIso, endIso) => `
SET statement_timeout = '3600s';
WITH prepared AS (
	SELECT
		power,
		NULLIF(error_msg, '') AS error_msg,
		(fault_status IS NOT NULL AND fault_status <> 0) AS has_fault,
		(latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0 OR gps_number IS NULL OR gps_number = 0) AS gps_abnormal,
		(power < 30 OR NULLIF(error_msg, '') IS NOT NULL OR (fault_status IS NOT NULL AND fault_status <> 0) = TRUE OR (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0 OR gps_number IS NULL OR gps_number = 0) = TRUE) AS has_unavailable_signal,
		CASE
			WHEN power < 10 THEN '0-9%'
			WHEN power < 20 THEN '10-19%'
			WHEN power < 30 THEN '20-29%'
			WHEN power < 40 THEN '30-39%'
			WHEN power < 50 THEN '40-49%'
			WHEN power < 60 THEN '50-59%'
			WHEN power < 70 THEN '60-69%'
			WHEN power < 80 THEN '70-79%'
			WHEN power < 90 THEN '80-89%'
			ELSE '90-100%'
		END AS band,
		CASE
			WHEN power < 10 THEN 0
			WHEN power < 20 THEN 1
			WHEN power < 30 THEN 2
			WHEN power < 40 THEN 3
			WHEN power < 50 THEN 4
			WHEN power < 60 THEN 5
			WHEN power < 70 THEN 6
			WHEN power < 80 THEN 7
			WHEN power < 90 THEN 8
			ELSE 9
		END AS sort_order
	FROM scooter_status_observations
	WHERE power IS NOT NULL
		AND observed_at >= '${startIso}'::timestamptz
		AND observed_at < '${endIso}'::timestamptz
),
grouped AS (
	SELECT
		GROUPING(band) AS grouped_band,
		GROUPING(error_msg) AS grouped_error_msg,
		band,
		sort_order,
		error_msg,
		count(*) AS total_observations,
		count(*) FILTER (WHERE has_unavailable_signal = TRUE) AS risk_signal_observations,
		count(*) FILTER (WHERE error_msg IS NOT NULL) AS error_observations,
		count(*) FILTER (WHERE power < 30) AS low_battery_observations,
		count(*) FILTER (WHERE has_fault = TRUE) AS fault_observations,
		count(*) FILTER (WHERE gps_abnormal = TRUE) AS gps_abnormal_observations
	FROM prepared
	GROUP BY GROUPING SETS ((band, sort_order), (error_msg), ())
),
summary AS (
	SELECT
		total_observations AS status_observations,
		total_observations AS joined_observations,
		risk_signal_observations,
		risk_signal_observations AS unavailable_observations,
		risk_signal_observations::double precision / NULLIF(total_observations, 0) * 100 AS risk_signal_rate,
		risk_signal_observations::double precision / NULLIF(total_observations, 0) * 100 AS unavailable_rate,
		low_battery_observations,
		low_battery_observations AS low_battery_unavailable_observations,
		error_observations,
		fault_observations,
		gps_abnormal_observations
	FROM grouped
	WHERE grouped_band = 1 AND grouped_error_msg = 1
),
battery AS (
	SELECT
		band,
		sort_order,
		total_observations,
		risk_signal_observations,
		error_observations,
		risk_signal_observations::double precision / NULLIF(total_observations, 0) * 100 AS risk_signal_rate
	FROM grouped
	WHERE grouped_band = 0
),
error_messages AS (
	SELECT
		grouped.error_msg,
		grouped.total_observations AS observations,
		grouped.total_observations::double precision / NULLIF(summary.status_observations, 0) * 100 AS share_of_all,
		grouped.total_observations::double precision / NULLIF(summary.risk_signal_observations, 0) * 100 AS share_of_signal_observations
	FROM grouped
	CROSS JOIN summary
	WHERE error_msg IS NOT NULL
		AND grouped_error_msg = 0
	ORDER BY observations DESC
),
reason_signals AS (
	SELECT '低電量（<30%）' AS reason, low_battery_observations AS observations
	FROM summary
	UNION ALL
	SELECT error_msg AS reason, observations
	FROM error_messages
),
reason_top AS (
	SELECT
		reason,
		observations,
		observations::double precision / NULLIF((SELECT risk_signal_observations FROM summary), 0) * 100 AS share_of_signal_observations
	FROM reason_signals
	WHERE observations > 0
	ORDER BY observations DESC
	LIMIT 12
)
SELECT jsonb_pretty(jsonb_build_object(
	'signalSummary', (SELECT to_jsonb(summary) FROM summary),
	'batteryBands', (SELECT jsonb_agg(to_jsonb(battery) ORDER BY sort_order) FROM battery),
	'errorMessages', (SELECT jsonb_agg(to_jsonb(error_messages) ORDER BY observations DESC) FROM error_messages),
	'reasonSignals', (SELECT jsonb_agg(to_jsonb(reason_top) ORDER BY observations DESC) FROM reason_top)
));
`;

const replenishmentSql = `
${baseCtes},
ordered AS (
	SELECT
		station_1m.*,
		row_number() OVER (PARTITION BY station_id ORDER BY bucket) AS station_row_number,
		(available_avg <= 0) AS is_shortage,
		lag(available_avg <= 0, 1, FALSE) OVER (PARTITION BY station_id ORDER BY bucket) AS previous_is_shortage
	FROM station_1m
),
marked AS (
	SELECT
		ordered.*,
		sum(CASE WHEN is_shortage = TRUE AND previous_is_shortage = FALSE THEN 1 ELSE 0 END) OVER (PARTITION BY station_id ORDER BY bucket) AS episode_id
	FROM ordered
),
episodes AS (
	SELECT
		station_id,
		station_name,
		campus,
		episode_id,
		min(bucket) AS start_bucket,
		min(local_bucket) AS start_local_bucket,
		max(bucket) AS end_bucket,
		max(local_bucket) AS end_local_bucket,
		max(station_row_number) AS end_row_number,
		(array_agg(total_avg ORDER BY bucket))[1] AS start_total,
		(array_agg(available_avg ORDER BY bucket))[1] AS start_available
	FROM marked
	WHERE is_shortage = TRUE
	GROUP BY 1, 2, 3, 4
),
recoveries AS (
	SELECT
		e.*,
		r.bucket AS recovery_bucket,
		r.local_bucket AS recovery_local_bucket,
		r.total_avg AS recovery_total,
		r.available_avg AS recovery_available,
		extract(epoch FROM (r.bucket - e.start_bucket)) / 60 AS minutes_to_recovery
	FROM episodes e
	LEFT JOIN ordered r ON r.station_id = e.station_id
		AND r.station_row_number = e.end_row_number + 1
		AND r.available_avg > 0
),
classified AS (
	SELECT
		*,
		CASE
			WHEN recovery_bucket IS NULL THEN '觀測窗內未恢復'
			WHEN recovery_available - start_available >= 5 OR recovery_total - start_total >= 5 OR recovery_available >= 5 THEN '疑似大量回補'
			ELSE '一般歸還或零散恢復'
		END AS recovery_type
	FROM recoveries
),
summary AS (
	SELECT
		recovery_type,
		count(*) AS episodes,
		count(*) FILTER (WHERE recovery_bucket IS NOT NULL) AS recovered_episodes,
		percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes_to_recovery) FILTER (WHERE recovery_bucket IS NOT NULL) AS median_minutes_to_recovery,
		avg(minutes_to_recovery) FILTER (WHERE recovery_bucket IS NOT NULL) AS average_minutes_to_recovery,
		count(*)::double precision / NULLIF((SELECT count(*) FROM classified), 0) * 100 AS share
	FROM classified
	GROUP BY 1
),
station_events AS (
	SELECT
		station_name,
		campus,
		count(*) AS suspected_rebalance_events
	FROM classified
	WHERE recovery_type = '疑似大量回補'
	GROUP BY 1, 2
	ORDER BY suspected_rebalance_events DESC
	LIMIT 10
)
SELECT jsonb_pretty(jsonb_build_object(
	'recoverySummary', (SELECT jsonb_agg(to_jsonb(summary) ORDER BY episodes DESC) FROM summary),
	'rebalanceStations', (SELECT jsonb_agg(to_jsonb(station_events) ORDER BY suspected_rebalance_events DESC) FROM station_events)
));
`;

const asArray = value => (Array.isArray(value) ? value : []);

const numberValue = value => {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? number : 0;
};

const round = (value, digits = 2) => {
	const factor = 10 ** digits;
	return Math.round(numberValue(value) * factor) / factor;
};

const percentage = (numerator, denominator) => {
	const base = numberValue(denominator);
	if (base === 0) return 0;
	return round((numberValue(numerator) / base) * 100, 2);
};

const addFields = (target, source, fields) => {
	for (const field of fields) target[field] = numberValue(target[field]) + numberValue(source?.[field]);
};

const mergeRows = (target, rows, keyForRow, copyFields, sumFields) => {
	for (const row of asArray(rows)) {
		const key = keyForRow(row);
		if (!target.has(key)) {
			const record = {};
			for (const field of copyFields) record[field] = row[field];
			for (const field of sumFields) record[field] = 0;
			target.set(key, record);
		}

		const record = target.get(key);
		for (const field of sumFields) record[field] += numberValue(row[field]);
	}
};

const buildMergedStatus = chunkResults => {
	const batteryByBand = new Map();
	const errorsByMessage = new Map();
	const reasonsByName = new Map();
	const signalSummary = {
		status_observations: 0,
		joined_observations: 0,
		risk_signal_observations: 0,
		unavailable_observations: 0,
		low_battery_observations: 0,
		low_battery_unavailable_observations: 0,
		error_observations: 0,
		fault_observations: 0,
		gps_abnormal_observations: 0
	};

	for (const result of chunkResults) {
		addFields(signalSummary, result.signalSummary, [
			"status_observations",
			"joined_observations",
			"risk_signal_observations",
			"unavailable_observations",
			"low_battery_observations",
			"low_battery_unavailable_observations",
			"error_observations",
			"fault_observations",
			"gps_abnormal_observations"
		]);
		mergeRows(batteryByBand, result.batteryBands, row => String(row.band), ["band", "sort_order"], ["total_observations", "risk_signal_observations", "error_observations"]);
		mergeRows(errorsByMessage, result.errorMessages, row => String(row.error_msg), ["error_msg"], ["observations"]);
		mergeRows(reasonsByName, result.reasonSignals, row => String(row.reason), ["reason"], ["observations"]);
	}

	signalSummary.risk_signal_rate = percentage(signalSummary.risk_signal_observations, signalSummary.status_observations);
	signalSummary.unavailable_rate = signalSummary.risk_signal_rate;

	const batteryBands = Array.from(batteryByBand.values())
		.map(row => ({
			...row,
			total_observations: Math.round(row.total_observations),
			risk_signal_observations: Math.round(row.risk_signal_observations),
			unavailable_observations: Math.round(row.risk_signal_observations),
			error_observations: Math.round(row.error_observations),
			risk_signal_rate: percentage(row.risk_signal_observations, row.total_observations),
			unavailable_rate: percentage(row.risk_signal_observations, row.total_observations)
		}))
		.sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order));

	const errorMessages = Array.from(errorsByMessage.values())
		.map(row => ({
			...row,
			observations: Math.round(row.observations),
			share_of_all: percentage(row.observations, signalSummary.status_observations),
			share_of_signal_observations: percentage(row.observations, signalSummary.risk_signal_observations),
			share_of_unavailable: percentage(row.observations, signalSummary.risk_signal_observations)
		}))
		.sort((a, b) => b.observations - a.observations)
		.slice(0, 20);

	const reasonSignals = Array.from(reasonsByName.values())
		.map(row => ({
			...row,
			observations: Math.round(row.observations),
			share_of_signal_observations: percentage(row.observations, signalSummary.risk_signal_observations),
			share_of_unavailable: percentage(row.observations, signalSummary.risk_signal_observations)
		}))
		.sort((a, b) => b.observations - a.observations)
		.slice(0, 12);

	return { signalSummary, batteryBands, errorMessages, reasonSignals };
};

console.error(`Fetching report data from ${sshHost}:${remoteDir}`);
const station = psql(stationSql);
console.error("Fetched station aggregates");
const statusRanges = asArray(psql(statusRangesSql));
const statusChunkConcurrency = Number.isFinite(statusConcurrency) && statusConcurrency > 0 ? statusConcurrency : 3;
console.error(`Fetching ${statusRanges.length} status chunks with concurrency ${statusChunkConcurrency}`);
const statusChunks = await runWithConcurrency(statusRanges, statusChunkConcurrency, async (range, index) => {
	console.error(`Fetching status signal aggregates for ${range.chunkName} (${index + 1}/${statusRanges.length})`);
	const result = await psqlAsync(statusSignalSqlForRange(range.startIso, range.endIso));
	console.error(`Fetched status signal aggregates for ${range.chunkName}`);
	return result;
});
const status = buildMergedStatus(statusChunks);
console.error("Merged status signal aggregates");
const replenishment = psql(replenishmentSql);
console.error("Fetched replenishment aggregates");
const routes = {
	routeMeta: {
		total_transitions: 0,
		transitions_excluding_low_battery: 0,
		usable: false
	},
	routeRisks: [],
	routeLimitation:
		"車輛層級路線故障需要把 scooter_info_observations 與 scooter_status_observations 以同車、同時間可靠對齊；遠端原始 hypertable 在本次重算時無法於可接受時間內完成全期間 join，因此本報告不把路線故障率當作主要結論。"
};
console.error("Recorded route analysis limitation");

const generated = {
	generatedAt: new Date().toISOString(),
	source: {
		sshHost,
		remoteDir,
		dbContainer,
		database: "where-is-oloo docker compose db / oloo"
	},
	...station,
	...status,
	...replenishment,
	...routes
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.error(`Wrote ${outputPath}`);
