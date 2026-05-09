import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";

import type { Config } from "./config.js";
import type { Db } from "./db.js";

type FleetSummaryRow = {
	total: string;
	active: string;
	available: string;
	rented: string;
	with_location: string;
	last_info_at: Date | string | null;
	last_status_at: Date | string | null;
};

type StationRow = {
	station_id: number | null;
	station_name: string | null;
	station_number: string | null;
	total_parking_space: string | null;
	scooter_count: string | null;
	available_scooter_count: string | null;
	rented_scooter_count: string | null;
	vehicle_count: string | null;
	available_vehicle_count: string | null;
	rented_vehicle_count: string | null;
	last_scooter_seen_at: Date | string | null;
	last_vehicle_seen_at: Date | string | null;
};

const toInt = (value: string | number | null | undefined) => (value === null || value === undefined ? 0 : Number(value));
const toIso = (value: Date | string | null) => (value instanceof Date ? value.toISOString() : value);

export const startDashboard = (db: Db, config: Config): Server => {
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

			if (url.pathname === "/api/stats") {
				const stats = await loadStats(db);
				response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
				response.end(JSON.stringify(stats));
				return;
			}

			if (url.pathname === "/") {
				response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
				response.end(dashboardHtml);
				return;
			}

			response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
			response.end("Not found");
		} catch (error) {
			console.error(JSON.stringify({ level: "error", message: "dashboard request failed", error: error instanceof Error ? error.message : String(error) }));
			response.writeHead(500, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
			response.end(JSON.stringify({ error: "dashboard request failed" }));
		}
	});

	server.listen(config.dashboardPort, config.dashboardHost, () => {
		console.log(JSON.stringify({ level: "info", message: "dashboard listening", host: config.dashboardHost, port: config.dashboardPort }));
	});

	return server;
};

const loadStats = async (db: Db) => {
	const [scooterFleet, vehicleFleet, stationCounts, crawls, rawSnapshots, staticItems] = await Promise.all([
		db.query<FleetSummaryRow>(`
SELECT
	count(*) AS total,
	count(*) FILTER (WHERE is_active = TRUE) AS active,
	count(*) FILTER (WHERE is_active = TRUE AND is_rented = FALSE) AS available,
	count(*) FILTER (WHERE is_rented = TRUE) AS rented,
	count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND latitude <> 0 AND longitude <> 0) AS with_location,
	max(info_observed_at) AS last_info_at,
	max(status_observed_at) AS last_status_at
FROM current_scooter_locations
`),
		db.query<FleetSummaryRow>(`
SELECT
	count(*) AS total,
	count(*) FILTER (WHERE is_active = TRUE) AS active,
	count(*) FILTER (WHERE is_active = TRUE AND is_rented = FALSE) AS available,
	count(*) FILTER (WHERE is_rented = TRUE) AS rented,
	count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND latitude <> 0 AND longitude <> 0) AS with_location,
	max(info_observed_at) AS last_info_at,
	max(status_observed_at) AS last_status_at
FROM current_vehicle_locations
`),
		db.query<StationRow>(`
SELECT
	COALESCE(sc.station_id, vc.station_id) AS station_id,
	station.payload->>'name' AS station_name,
	station.payload->>'stationNumber' AS station_number,
	station.payload->>'totalParkingSpace' AS total_parking_space,
	sc.scooter_count,
	sc.available_scooter_count,
	sc.rented_scooter_count,
	vc.vehicle_count,
	vc.available_vehicle_count,
	vc.rented_vehicle_count,
	sc.observed_at AS last_scooter_seen_at,
	vc.observed_at AS last_vehicle_seen_at
FROM current_station_scooter_counts sc
FULL OUTER JOIN current_station_vehicle_counts vc ON vc.station_id IS NOT DISTINCT FROM sc.station_id
LEFT JOIN static_endpoint_items station
	ON station.endpoint_name = 'scooter-rental-stations-active-stations'
	AND station.source_id = COALESCE(sc.station_id, vc.station_id)::text
ORDER BY COALESCE(sc.available_scooter_count, 0) + COALESCE(vc.available_vehicle_count, 0) DESC, station_name NULLS LAST
`),
		db.query(`
SELECT DISTINCT ON (endpoint_name)
	endpoint_name,
	mode,
	status,
	http_status,
	item_count,
	started_at,
	finished_at,
	error
FROM crawl_runs
ORDER BY endpoint_name, started_at DESC
`),
		db.query(`
SELECT endpoint_name, count(*) AS snapshot_count, max(observed_at) AS last_observed_at
FROM raw_endpoint_observations
WHERE observed_at >= now() - interval '1 hour'
GROUP BY endpoint_name
ORDER BY endpoint_name
`),
		db.query(`
SELECT endpoint_name, count(*) AS item_count, max(fetched_at) AS last_fetched_at
FROM static_endpoint_items
GROUP BY endpoint_name
ORDER BY endpoint_name
`)
	]);

	return {
		generatedAt: new Date().toISOString(),
		fleet: {
			scooters: normalizeFleet(scooterFleet.rows[0]),
			vehicles: normalizeFleet(vehicleFleet.rows[0])
		},
		stations: stationCounts.rows.map(row => ({
			stationId: row.station_id,
			name: row.station_name,
			stationNumber: row.station_number,
			totalParkingSpace: toInt(row.total_parking_space),
			scooters: {
				total: toInt(row.scooter_count),
				available: toInt(row.available_scooter_count),
				rented: toInt(row.rented_scooter_count)
			},
			vehicles: {
				total: toInt(row.vehicle_count),
				available: toInt(row.available_vehicle_count),
				rented: toInt(row.rented_vehicle_count)
			},
			lastScooterSeenAt: toIso(row.last_scooter_seen_at),
			lastVehicleSeenAt: toIso(row.last_vehicle_seen_at)
		})),
		crawls: crawls.rows,
		rawSnapshotsLastHour: rawSnapshots.rows,
		staticItems: staticItems.rows
	};
};

const normalizeFleet = (row: FleetSummaryRow | undefined) => ({
	total: toInt(row?.total),
	active: toInt(row?.active),
	available: toInt(row?.available),
	rented: toInt(row?.rented),
	withLocation: toInt(row?.with_location),
	lastInfoAt: toIso(row?.last_info_at ?? null),
	lastStatusAt: toIso(row?.last_status_at ?? null)
});

const dashboardHtml = readFileSync(new URL("../dashboard.html", import.meta.url), "utf8");
