import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import pg from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://oloo:oloo@localhost:5432/oloo";
const bucket = process.env.ANALYSIS_BUCKET ?? "5 minutes";
const startAt = process.env.ANALYSIS_START || null;
const endAt = process.env.ANALYSIS_END || null;
const outputDir = resolve(process.env.ANALYSIS_OUT_DIR ?? "exports/analysis");

const csvHeaders = [
	"bucket",
	"station_id",
	"station_name",
	"station_number",
	"campus",
	"latitude",
	"longitude",
	"total_parking_space",
	"scooter_total_avg",
	"scooter_available_avg",
	"scooter_rented_avg",
	"vehicle_total_avg",
	"vehicle_available_avg",
	"vehicle_rented_avg",
	"fleet_total_avg",
	"fleet_available_avg",
	"fleet_rented_avg"
];

const sql = `
WITH station_names AS (
	SELECT
		source_id::integer AS station_id,
		payload->>'name' AS station_name,
		payload->>'stationNumber' AS station_number,
		NULLIF(payload->>'latitude', '')::double precision AS latitude,
		NULLIF(payload->>'longitude', '')::double precision AS longitude,
		NULLIF(payload->>'totalParkingSpace', '')::integer AS total_parking_space
	FROM static_endpoint_items
	WHERE endpoint_name = 'scooter-rental-stations-active-stations'
		AND source_id ~ '^[0-9]+$'
),
scooter AS (
	SELECT
		time_bucket($1::interval, observed_at) AS bucket,
		station_id,
		avg(scooter_count)::double precision AS scooter_total_avg,
		avg(available_scooter_count)::double precision AS scooter_available_avg,
		avg(rented_scooter_count)::double precision AS scooter_rented_avg
	FROM station_scooter_counts
	WHERE ($2::timestamptz IS NULL OR observed_at >= $2::timestamptz)
		AND ($3::timestamptz IS NULL OR observed_at < $3::timestamptz)
	GROUP BY 1, 2
),
vehicle AS (
	SELECT
		time_bucket($1::interval, observed_at) AS bucket,
		station_id,
		avg(vehicle_count)::double precision AS vehicle_total_avg,
		avg(available_vehicle_count)::double precision AS vehicle_available_avg,
		avg(rented_vehicle_count)::double precision AS vehicle_rented_avg
	FROM station_vehicle_counts
	WHERE ($2::timestamptz IS NULL OR observed_at >= $2::timestamptz)
		AND ($3::timestamptz IS NULL OR observed_at < $3::timestamptz)
	GROUP BY 1, 2
)
SELECT
	COALESCE(s.bucket, v.bucket) AS bucket,
	COALESCE(s.station_id, v.station_id) AS station_id,
	n.station_name,
	n.station_number,
	CASE
		WHEN n.station_number ILIKE 'NTHU%' OR n.station_name LIKE '%清大%' THEN '清大'
		WHEN n.station_number ILIKE 'NCTU%' OR n.station_name LIKE '%交大%' THEN '交大'
		WHEN n.station_name IS NULL THEN '未分站'
		ELSE '其他'
	END AS campus,
	n.latitude,
	n.longitude,
	n.total_parking_space,
	COALESCE(s.scooter_total_avg, 0) AS scooter_total_avg,
	COALESCE(s.scooter_available_avg, 0) AS scooter_available_avg,
	COALESCE(s.scooter_rented_avg, 0) AS scooter_rented_avg,
	COALESCE(v.vehicle_total_avg, 0) AS vehicle_total_avg,
	COALESCE(v.vehicle_available_avg, 0) AS vehicle_available_avg,
	COALESCE(v.vehicle_rented_avg, 0) AS vehicle_rented_avg,
	COALESCE(s.scooter_total_avg, 0) + COALESCE(v.vehicle_total_avg, 0) AS fleet_total_avg,
	COALESCE(s.scooter_available_avg, 0) + COALESCE(v.vehicle_available_avg, 0) AS fleet_available_avg,
	COALESCE(s.scooter_rented_avg, 0) + COALESCE(v.vehicle_rented_avg, 0) AS fleet_rented_avg
FROM scooter s
FULL OUTER JOIN vehicle v
	ON v.bucket = s.bucket
	AND v.station_id IS NOT DISTINCT FROM s.station_id
LEFT JOIN station_names n
	ON n.station_id = COALESCE(s.station_id, v.station_id)
ORDER BY bucket, campus, station_name NULLS LAST, station_id NULLS LAST
`;

const formatValue = value => {
	if (value instanceof Date) return value.toISOString();
	if (value === null || value === undefined) return "";
	return String(value);
};

const toCsvCell = value => {
	const text = formatValue(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const writeCsv = (path, rows) => {
	const lines = [csvHeaders.join(",")];

	for (const row of rows) {
		lines.push(csvHeaders.map(header => toCsvCell(row[header])).join(","));
	}

	writeFileSync(path, `${lines.join("\n")}\n`);
};

const summarize = rows => {
	const stations = new Map();

	for (const row of rows) {
		const key = row.station_id === null ? "none" : String(row.station_id);
		if (!stations.has(key)) {
			stations.set(key, {
				id: row.station_id,
				name: row.station_name ?? "未分站",
				number: row.station_number,
				campus: row.campus,
				latitude: row.latitude,
				longitude: row.longitude,
				totalParkingSpace: row.total_parking_space
			});
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		bucket,
		startAt,
		endAt,
		dataStartAt: rows[0]?.bucket?.toISOString?.() ?? null,
		dataEndAt: rows.at(-1)?.bucket?.toISOString?.() ?? null,
		rowCount: rows.length,
		stationCount: stations.size,
		stations: Array.from(stations.values()).sort((a, b) => `${a.campus}:${a.name}`.localeCompare(`${b.campus}:${b.name}`, "zh-Hant"))
	};
};

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
	const result = await client.query(sql, [bucket, startAt, endAt]);

	mkdirSync(outputDir, { recursive: true });
	writeCsv(join(outputDir, "station_counts_5min.csv"), result.rows);
	writeFileSync(join(outputDir, "summary.json"), `${JSON.stringify(summarize(result.rows), null, 2)}\n`);

	console.log(`Wrote ${result.rows.length} rows to ${outputDir}`);
} finally {
	await client.end();
}
