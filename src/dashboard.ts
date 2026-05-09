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

const dashboardHtml = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Oloo 統計狀態</title>
	<style>
		:root { color-scheme: dark; --bg: #111827; --panel: #172033; --muted: #9ca3af; --text: #f9fafb; --accent: #7dd3fc; --good: #86efac; --warn: #facc15; --bad: #fca5a5; --line: rgba(255,255,255,.11); }
		* { box-sizing: border-box; }
		body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top left, #1e3a5f, transparent 36rem), var(--bg); color: var(--text); }
		main { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0 48px; }
		header { display: flex; gap: 16px; justify-content: space-between; align-items: end; margin-bottom: 22px; }
		h1 { margin: 0; font-size: clamp(28px, 5vw, 52px); letter-spacing: -0.06em; }
		.subtitle { margin: 8px 0 0; color: var(--muted); }
		.status { color: var(--accent); font-size: 14px; text-align: right; }
		.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
		.card { background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.035)); border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 16px 40px rgba(0,0,0,.24); }
		.card h2, .card h3 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 650; }
		.metric { font-size: 42px; line-height: 1; font-weight: 800; letter-spacing: -0.05em; }
		.kv { display: grid; grid-template-columns: 1fr auto; gap: 8px 14px; margin-top: 14px; font-size: 14px; color: var(--muted); }
		.kv strong { color: var(--text); }
		section { margin-top: 18px; }
		.section-title { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 0 0 10px; }
		.section-title h2 { margin: 0; font-size: 20px; letter-spacing: -0.03em; }
		.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 18px; background: rgba(17,24,39,.72); }
		table { width: 100%; border-collapse: collapse; min-width: 760px; }
		th, td { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
		th:first-child, td:first-child { text-align: left; }
		th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
		tr:last-child td { border-bottom: 0; }
		.name { color: var(--text); font-weight: 700; }
		.muted { color: var(--muted); }
		.good { color: var(--good); }
		.warn { color: var(--warn); }
		.bad { color: var(--bad); }
		.error { margin-top: 16px; color: var(--bad); }
		@media (max-width: 820px) { main { width: min(100vw - 20px, 1180px); padding-top: 22px; } header { display: block; } .status { margin-top: 10px; text-align: left; } .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .metric { font-size: 34px; } }
	</style>
</head>
<body>
	<main>
		<header>
			<div>
				<h1>Oloo 統計狀態</h1>
				<p class="subtitle">每 30 秒自動刷新，資料直接來自 TimescaleDB 最新 view。</p>
			</div>
			<div class="status" id="status">載入中...</div>
		</header>
		<div id="app"></div>
	</main>
	<script>
		const fmt = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'medium' });
		const n = value => Number(value ?? 0).toLocaleString('zh-TW');
		const time = value => value ? fmt.format(new Date(value)) : '尚無資料';
		const pct = (part, total) => total ? Math.round(part / total * 100) + '%' : '0%';
		const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

		async function load() {
			const res = await fetch('/api/stats', { cache: 'no-store' });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			return res.json();
		}

		function fleetCard(title, fleet) {
			return \`<article class="card">
				<h2>\${html(title)}</h2>
				<div class="metric">\${n(fleet.available)}</div>
				<div class="muted">可用 / \${n(fleet.total)} 總數</div>
				<div class="kv">
					<span>Active</span><strong>\${n(fleet.active)} (\${pct(fleet.active, fleet.total)})</strong>
					<span>租用中</span><strong>\${n(fleet.rented)}</strong>
					<span>有位置</span><strong>\${n(fleet.withLocation)}</strong>
					<span>資訊更新</span><strong>\${time(fleet.lastInfoAt)}</strong>
					<span>狀態更新</span><strong>\${time(fleet.lastStatusAt)}</strong>
				</div>
			</article>\`;
		}

		function render(data) {
			const totalAvailable = data.fleet.scooters.available + data.fleet.vehicles.available;
			const totalRented = data.fleet.scooters.rented + data.fleet.vehicles.rented;
			const failedCrawls = data.crawls.filter(crawl => crawl.status !== 'ok');
			const stations = data.stations.filter(station => station.stationId !== null).slice(0, 25);

			document.querySelector('#status').textContent = '最後刷新：' + time(data.generatedAt);
			document.querySelector('#app').innerHTML = \`
				<div class="grid">
					\${fleetCard('滑板車可用數', data.fleet.scooters)}
					\${fleetCard('車輛可用數', data.fleet.vehicles)}
					<article class="card"><h2>總可用數</h2><div class="metric good">\${n(totalAvailable)}</div><div class="kv"><span>滑板車</span><strong>\${n(data.fleet.scooters.available)}</strong><span>車輛</span><strong>\${n(data.fleet.vehicles.available)}</strong><span>租用中</span><strong>\${n(totalRented)}</strong></div></article>
					<article class="card"><h2>爬蟲健康</h2><div class="metric \${failedCrawls.length ? 'bad' : 'good'}">\${failedCrawls.length ? '異常' : 'OK'}</div><div class="kv"><span>Endpoint</span><strong>\${n(data.crawls.length)}</strong><span>近 1 小時快照</span><strong>\${n(data.rawSnapshotsLastHour.reduce((sum, item) => sum + Number(item.snapshot_count ?? 0), 0))}</strong><span>靜態項目</span><strong>\${n(data.staticItems.reduce((sum, item) => sum + Number(item.item_count ?? 0), 0))}</strong></div></article>
				</div>
				<section>
					<div class="section-title"><h2>站點可用數 Top 25</h2><span class="muted">依滑板車 + 車輛可用數排序</span></div>
					<div class="table-wrap"><table><thead><tr><th>站點</th><th>車位</th><th>滑板車總數</th><th>滑板車可用</th><th>滑板車租用</th><th>車輛總數</th><th>車輛可用</th><th>車輛租用</th><th>更新時間</th></tr></thead><tbody>
						\${stations.map(station => \`<tr><td><div class="name">\${html(station.name ?? '未知站點')}</div><div class="muted">\${html(station.stationNumber ?? station.stationId)}</div></td><td>\${n(station.totalParkingSpace)}</td><td>\${n(station.scooters.total)}</td><td class="good">\${n(station.scooters.available)}</td><td>\${n(station.scooters.rented)}</td><td>\${n(station.vehicles.total)}</td><td class="good">\${n(station.vehicles.available)}</td><td>\${n(station.vehicles.rented)}</td><td class="muted">\${time(station.lastScooterSeenAt ?? station.lastVehicleSeenAt)}</td></tr>\`).join('')}
					</tbody></table></div>
				</section>
				<section>
					<div class="section-title"><h2>最近爬蟲狀態</h2><span class="muted">每個 endpoint 最新一次</span></div>
					<div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>模式</th><th>狀態</th><th>HTTP</th><th>筆數</th><th>開始</th><th>結束</th><th>錯誤</th></tr></thead><tbody>
						\${data.crawls.map(crawl => \`<tr><td class="name">\${html(crawl.endpoint_name)}</td><td>\${html(crawl.mode)}</td><td class="\${crawl.status === 'ok' ? 'good' : 'bad'}">\${html(crawl.status)}</td><td>\${html(crawl.http_status ?? '')}</td><td>\${n(crawl.item_count)}</td><td class="muted">\${time(crawl.started_at)}</td><td class="muted">\${time(crawl.finished_at)}</td><td class="bad">\${html(crawl.error ?? '')}</td></tr>\`).join('')}
					</tbody></table></div>
				</section>
			\`;
		}

		async function refresh() {
			try {
				render(await load());
			} catch (error) {
				document.querySelector('#status').textContent = '載入失敗';
				document.querySelector('#app').innerHTML = '<div class="card error">Dashboard 載入失敗：' + html(error.message ?? error) + '</div>';
			}
		}

		refresh();
		setInterval(refresh, 30000);
	</script>
</body>
</html>`;
