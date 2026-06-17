import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sshHost = process.env.REPORT_DATA_SSH_HOST ?? "emfox";
const remoteDir = process.env.REPORT_DATA_REMOTE_DIR ?? "~/where-is-oloo";
const dbContainer = process.env.REPORT_DATA_DB_CONTAINER ?? "where-is-oloo-db-1";
const concurrency = Number.parseInt(process.env.REPORT_DATA_CONCURRENCY ?? "2", 10);
const rangeHours = Number.parseFloat(process.env.REPORT_DATA_RANGE_HOURS ?? "12");
const batterySampleEveryHours = Number.parseFloat(process.env.REPORT_DATA_BATTERY_SAMPLE_EVERY_HOURS ?? "6");
const batterySampleMinutes = Number.parseFloat(process.env.REPORT_DATA_BATTERY_SAMPLE_MINUTES ?? "15");
const outputPath = resolve(process.argv[2] ?? "src/report-data.generated.json");
const reuseStatus = process.env.REPORT_DATA_REUSE_STATUS !== "false";
const remotePsqlCommand = `cd ${remoteDir} && docker exec -i ${dbContainer} psql -U oloo -d oloo -X -q -t -A -v ON_ERROR_STOP=1`;

const existingData = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;

const psql = sql => {
	const result = spawnSync("ssh", [sshHost, remotePsqlCommand], {
		encoding: "utf8",
		input: sql,
		maxBuffer: 1024 * 1024 * 120
	});

	if (result.status !== 0) {
		throw new Error(`remote psql failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
	}

	const text = result.stdout.trim();
	return text ? JSON.parse(text) : null;
};

const psqlAsync = sql =>
	new Promise((resolveResult, reject) => {
		const child = spawn("ssh", [sshHost, remotePsqlCommand], { stdio: ["pipe", "pipe", "pipe"] });
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

const runWithConcurrency = async (items, workerCount, worker) => {
	const results = new Array(items.length);
	let nextIndex = 0;
	const count = Math.max(1, Math.min(workerCount, items.length));

	await Promise.all(
		Array.from({ length: count }, async () => {
			while (nextIndex < items.length) {
				const index = nextIndex;
				nextIndex += 1;
				results[index] = await worker(items[index], index);
			}
		})
	);

	return results;
};

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
	return base === 0 ? 0 : round((numberValue(numerator) / base) * 100, 2);
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

const normalCdf = x => {
	const sign = x < 0 ? -1 : 1;
	const abs = Math.abs(x) / Math.sqrt(2);
	const t = 1 / (1 + 0.3275911 * abs);
	const erf = sign * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-abs * abs));
	return 0.5 * (1 + erf);
};

const wilsonInterval = (successes, total) => {
	const n = numberValue(total);
	if (n === 0) return { low: 0, high: 0 };
	const z = 1.96;
	const p = numberValue(successes) / n;
	const denominator = 1 + (z * z) / n;
	const center = p + (z * z) / (2 * n);
	const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
	return {
		low: round(((center - spread) / denominator) * 100, 2),
		high: round(((center + spread) / denominator) * 100, 2)
	};
};

const twoProportionTest = ({ name, hypothesis, groupA, groupB, eventField }) => {
	const x1 = numberValue(groupA[eventField]);
	const n1 = numberValue(groupA.n);
	const x2 = numberValue(groupB[eventField]);
	const n2 = numberValue(groupB.n);
	const p1 = n1 === 0 ? 0 : x1 / n1;
	const p2 = n2 === 0 ? 0 : x2 / n2;
	const pooled = n1 + n2 === 0 ? 0 : (x1 + x2) / (n1 + n2);
	const pooledSe = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(n1, 1) + 1 / Math.max(n2, 1)));
	const unpooledSe = Math.sqrt((p1 * (1 - p1)) / Math.max(n1, 1) + (p2 * (1 - p2)) / Math.max(n2, 1));
	const z = pooledSe === 0 ? 0 : (p1 - p2) / pooledSe;
	const pValue = 2 * (1 - normalCdf(Math.abs(z)));
	const diff = p1 - p2;

	return {
		name,
		hypothesis,
		metric: eventField === "shortage" ? "缺車率" : "低庫存率",
		group_a: groupA.label,
		group_b: groupB.label,
		n_a: n1,
		event_a: x1,
		rate_a: round(p1 * 100, 2),
		n_b: n2,
		event_b: x2,
		rate_b: round(p2 * 100, 2),
		difference_percentage_points: round(diff * 100, 2),
		ci_low: round((diff - 1.96 * unpooledSe) * 100, 2),
		ci_high: round((diff + 1.96 * unpooledSe) * 100, 2),
		z: round(z, 3),
		p_value: round(Math.max(0, Math.min(1, pValue)), 6),
		conclusion: pValue < 0.05 ? "拒絕虛無假設，兩組比例有顯著差異。" : "未拒絕虛無假設，資料不足以說兩組比例不同。"
	};
};

const baseCtes = `
SET statement_timeout = '1800s';
WITH station_meta AS MATERIALIZED (
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
),
scoped_station AS (
	SELECT '每日整體' AS scope, local_bucket, campus, station_id, station_name, available_avg
	FROM station_15m
	UNION ALL
	SELECT CASE extract(isodow FROM local_bucket)::integer WHEN 1 THEN '星期一' ELSE '星期五' END AS scope,
		local_bucket, campus, station_id, station_name, available_avg
	FROM station_15m
	WHERE extract(isodow FROM local_bucket)::integer IN (1, 5)
),
ranked_station AS (
	SELECT
		*,
		extract(hour FROM local_bucket)::integer AS hour,
		row_number() OVER (PARTITION BY scope, campus, local_bucket ORDER BY available_avg DESC, station_name) AS availability_rank
	FROM scoped_station
),
availability_bucket AS (
	SELECT
		scope,
		campus,
		local_bucket,
		hour,
		count(*) AS station_count,
		count(*) FILTER (WHERE available_avg >= 1) AS stations_ge_1,
		count(*) FILTER (WHERE available_avg >= 3) AS stations_ge_3,
		count(*) FILTER (WHERE available_avg >= 5) AS stations_ge_5,
		sum(available_avg)::double precision AS total_available,
		sum(available_avg) FILTER (WHERE availability_rank <= 3)::double precision AS top3_available,
		sum(available_avg) FILTER (WHERE availability_rank <= 3)::double precision / NULLIF(sum(available_avg), 0) * 100 AS top3_share
	FROM ranked_station
	GROUP BY 1, 2, 3, 4
),
availability_dispersion AS (
	SELECT
		scope,
		campus,
		hour,
		avg(stations_ge_1)::double precision AS stations_ge_1_avg,
		avg(stations_ge_3)::double precision AS stations_ge_3_avg,
		avg(stations_ge_5)::double precision AS stations_ge_5_avg,
		avg(total_available)::double precision AS total_available_avg,
		avg(top3_available)::double precision AS top3_available_avg,
		avg(top3_share)::double precision AS top3_share_avg
	FROM availability_bucket
	GROUP BY 1, 2, 3
),
night_station AS (
	SELECT
		campus,
		station_name,
		sum(available_avg)::double precision AS available_sum,
		sum(sum(available_avg)) OVER (PARTITION BY campus)::double precision AS campus_available_sum
	FROM station_15m
	WHERE extract(hour FROM local_bucket)::integer >= 21 OR extract(hour FROM local_bucket)::integer <= 5
	GROUP BY 1, 2
),
night_station_top AS (
	SELECT
		campus,
		station_name,
		available_sum,
		available_sum / NULLIF(campus_available_sum, 0) * 100 AS share,
		row_number() OVER (PARTITION BY campus ORDER BY available_sum DESC, station_name) AS station_rank
	FROM night_station
),
comparison_campus AS (
	SELECT
		campus AS label,
		count(*) AS n,
		count(*) FILTER (WHERE available_avg <= 0) AS shortage,
		count(*) FILTER (WHERE available_avg < 3) AS low_stock
	FROM station_15m
	GROUP BY 1
),
comparison_weekday AS (
	SELECT
		campus,
		CASE extract(isodow FROM local_bucket)::integer WHEN 1 THEN '星期一' ELSE '星期五' END AS weekday,
		concat(campus, ' ', CASE extract(isodow FROM local_bucket)::integer WHEN 1 THEN '星期一' ELSE '星期五' END) AS label,
		count(*) AS n,
		count(*) FILTER (WHERE available_avg <= 0) AS shortage,
		count(*) FILTER (WHERE available_avg < 3) AS low_stock
	FROM station_15m
	WHERE extract(isodow FROM local_bucket)::integer IN (1, 5)
	GROUP BY 1, 2, 3
)
SELECT jsonb_pretty(jsonb_build_object(
	'metadata', (SELECT to_jsonb(metadata) FROM metadata),
	'campusHour', (SELECT jsonb_agg(to_jsonb(campus_hour) ORDER BY campus, hour) FROM campus_hour),
	'weekdayHour', (SELECT jsonb_agg(to_jsonb(weekday_hour) ORDER BY isodow, campus, hour) FROM weekday_hour),
	'dailyStrategy', (SELECT jsonb_agg(to_jsonb(daily_strategy) ORDER BY scope, campus, hour) FROM daily_strategy),
	'stationRisk', (SELECT jsonb_agg(to_jsonb(station_risk) ORDER BY shortage_rate DESC, low_stock_rate DESC) FROM station_risk),
	'availabilityDispersion', (SELECT jsonb_agg(to_jsonb(availability_dispersion) ORDER BY scope, campus, hour) FROM availability_dispersion),
	'nightStationConcentration', (SELECT jsonb_agg(to_jsonb(night_station_top) ORDER BY campus, station_rank) FROM night_station_top WHERE station_rank <= 5),
	'comparisonCounts', jsonb_build_object(
		'campus', (SELECT jsonb_agg(to_jsonb(comparison_campus) ORDER BY label) FROM comparison_campus),
		'weekday', (SELECT jsonb_agg(to_jsonb(comparison_weekday) ORDER BY campus, weekday) FROM comparison_weekday)
	)
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
SET statement_timeout = '1800s';
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
		LEAST(9, GREATEST(0, floor(power / 10)::integer)) AS sort_order
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
		risk_signal_observations,
		low_battery_observations,
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
		error_observations
	FROM grouped
	WHERE grouped_band = 0
),
error_messages AS (
	SELECT
		grouped.error_msg,
		grouped.total_observations AS observations
	FROM grouped
	WHERE error_msg IS NOT NULL
		AND grouped_error_msg = 0
),
reason_signals AS (
	SELECT '低電量（<30%）' AS reason, low_battery_observations AS observations
	FROM summary
	UNION ALL
	SELECT error_msg AS reason, observations
	FROM error_messages
)
SELECT jsonb_pretty(jsonb_build_object(
	'signalSummary', (SELECT to_jsonb(summary) FROM summary),
	'batteryBands', (SELECT jsonb_agg(to_jsonb(battery) ORDER BY sort_order) FROM battery),
	'errorMessages', (SELECT jsonb_agg(to_jsonb(error_messages) ORDER BY observations DESC) FROM error_messages),
	'reasonSignals', (SELECT jsonb_agg(to_jsonb(reason_signals) ORDER BY observations DESC) FROM reason_signals)
));
`;

const batteryAvailabilitySqlForRange = (startIso, endIso) => `
SET statement_timeout = '2400s';
WITH station_meta AS (
	SELECT
		source_id::integer AS station_id,
		CASE
			WHEN payload->>'stationNumber' ILIKE 'NTHU%' OR payload->>'name' LIKE '%清大%' THEN '清大'
			WHEN payload->>'stationNumber' ILIKE 'NCTU%' OR payload->>'name' LIKE '%交大%' THEN '交大'
			ELSE '其他'
		END AS campus
	FROM static_endpoint_items
	WHERE endpoint_name = 'scooter-rental-stations-active-stations'
		AND source_id ~ '^[0-9]+$'
),
info_minute AS MATERIALIZED (
	SELECT
		time_bucket('15 minutes', i.observed_at) AS bucket,
		i.imei,
		(array_agg(m.campus ORDER BY i.observed_at DESC))[1] AS campus,
		(array_agg(i.is_active ORDER BY i.observed_at DESC))[1] AS is_active,
		(array_agg(i.account_id IS NOT NULL ORDER BY i.observed_at DESC))[1] AS is_rented
	FROM scooter_info_observations i
	JOIN station_meta m ON m.station_id = i.scooter_rental_station_id
	WHERE i.observed_at >= '${startIso}'::timestamptz
		AND i.observed_at < '${endIso}'::timestamptz
		AND m.campus IN ('清大', '交大')
		AND i.imei IS NOT NULL
	GROUP BY 1, 2
),
joined AS (
	SELECT
		i.campus,
		s.power,
		s.error_msg,
		s.has_fault,
		s.gps_abnormal,
		(i.is_active = FALSE) AS unavailable,
		CASE
			WHEN s.power < 10 THEN '0-9%'
			WHEN s.power < 20 THEN '10-19%'
			WHEN s.power < 30 THEN '20-29%'
			WHEN s.power < 40 THEN '30-39%'
			WHEN s.power < 50 THEN '40-49%'
			WHEN s.power < 60 THEN '50-59%'
			WHEN s.power < 70 THEN '60-69%'
			WHEN s.power < 80 THEN '70-79%'
			WHEN s.power < 90 THEN '80-89%'
			ELSE '90-100%'
		END AS band,
		LEAST(9, GREATEST(0, floor(s.power / 10)::integer)) AS sort_order
	FROM info_minute i
	JOIN LATERAL (
		SELECT
			s.power::double precision AS power,
			NULLIF(s.error_msg, '') AS error_msg,
			(s.fault_status IS NOT NULL AND s.fault_status <> 0) AS has_fault,
			(s.latitude IS NULL OR s.longitude IS NULL OR s.latitude = 0 OR s.longitude = 0 OR s.gps_number IS NULL OR s.gps_number = 0) AS gps_abnormal
		FROM scooter_status_observations s
		WHERE s.imei = i.imei
			AND s.observed_at >= i.bucket
			AND s.observed_at < i.bucket + interval '15 minutes'
			AND s.power IS NOT NULL
		ORDER BY s.observed_at DESC
		LIMIT 1
	) s ON TRUE
	WHERE i.is_rented = FALSE
),
summary AS (
	SELECT
		count(*) AS joined_observations,
		count(*) FILTER (WHERE unavailable) AS unavailable_observations,
		count(*) FILTER (WHERE unavailable = FALSE) AS available_observations,
		count(*) FILTER (WHERE unavailable AND power < 30) AS unavailable_low_30_observations,
		count(*) FILTER (WHERE unavailable AND power < 35) AS unavailable_low_35_observations,
		count(*) FILTER (WHERE unavailable AND power < 40) AS unavailable_low_40_observations,
		count(*) FILTER (WHERE unavailable AND error_msg IS NOT NULL) AS unavailable_error_observations,
		count(*) FILTER (WHERE unavailable AND has_fault) AS unavailable_fault_observations,
		count(*) FILTER (WHERE unavailable AND gps_abnormal) AS unavailable_gps_abnormal_observations
	FROM joined
),
bands AS (
	SELECT
		band,
		sort_order,
		count(*) AS total_observations,
		count(*) FILTER (WHERE unavailable) AS unavailable_observations,
		count(*) FILTER (WHERE error_msg IS NOT NULL) AS error_observations,
		count(*) FILTER (WHERE unavailable AND error_msg IS NOT NULL) AS unavailable_error_observations
	FROM joined
	GROUP BY 1, 2
),
thresholds AS (
	SELECT
		threshold,
		(SELECT count(*) FROM joined) AS total_observations,
		count(*) FILTER (WHERE power < threshold) AS under_threshold_observations,
		count(*) FILTER (WHERE unavailable) AS unavailable_observations,
		count(*) FILTER (WHERE unavailable AND power < threshold) AS unavailable_under_threshold_observations
	FROM joined
	CROSS JOIN (VALUES (30), (35), (40)) AS candidates(threshold)
	GROUP BY threshold
),
unavailable_errors AS (
	SELECT
		error_msg,
		count(*) AS observations
	FROM joined
	WHERE unavailable AND error_msg IS NOT NULL
	GROUP BY 1
	ORDER BY observations DESC
	LIMIT 20
),
campus AS (
	SELECT
		campus,
		count(*) AS total_observations,
		count(*) FILTER (WHERE unavailable) AS unavailable_observations,
		count(*) FILTER (WHERE unavailable AND power < 35) AS unavailable_low_35_observations
	FROM joined
	GROUP BY 1
)
SELECT jsonb_pretty(jsonb_build_object(
	'batteryAvailabilitySummary', (SELECT to_jsonb(summary) FROM summary),
	'batteryAvailabilityBands', (SELECT jsonb_agg(to_jsonb(bands) ORDER BY sort_order) FROM bands),
	'batteryThresholdCandidates', (SELECT jsonb_agg(to_jsonb(thresholds) ORDER BY threshold) FROM thresholds),
	'unavailableErrorMessages', (SELECT jsonb_agg(to_jsonb(unavailable_errors) ORDER BY observations DESC) FROM unavailable_errors),
	'batteryAvailabilityByCampus', (SELECT jsonb_agg(to_jsonb(campus) ORDER BY campus) FROM campus)
));
`;

const recoverySql = `
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
events AS (
	SELECT
		row_number() OVER () AS event_id,
		e.*,
		r.bucket AS recovery_bucket,
		r.local_bucket AS recovery_local_bucket,
		r.total_avg AS recovery_total,
		r.available_avg AS recovery_available,
		extract(epoch FROM (r.bucket - e.start_bucket)) / 60 AS minutes_to_recovery
	FROM episodes e
	JOIN ordered r ON r.station_id = e.station_id
		AND r.station_row_number = e.end_row_number + 1
		AND r.available_avg > 0
),
unrecovered AS (
	SELECT count(*) AS episodes
	FROM episodes e
	WHERE NOT EXISTS (
		SELECT 1
		FROM ordered r
		WHERE r.station_id = e.station_id
			AND r.station_row_number = e.end_row_number + 1
			AND r.available_avg > 0
	)
),
classified AS (
	SELECT
		e.*,
		GREATEST(e.recovery_total - e.start_total, 0)::double precision AS total_increase,
		GREATEST(e.recovery_available - e.start_available, 0)::double precision AS available_increase,
		CASE
			WHEN e.recovery_available >= 5 OR e.recovery_available - e.start_available >= 5 OR e.recovery_total - e.start_total >= 5 THEN '大量回補'
			WHEN e.recovery_total - e.start_total < 1 AND e.recovery_available - e.start_available > 0 THEN '換電/修復代理'
			WHEN e.recovery_total - e.start_total > 0 THEN '一般歸還'
			ELSE '零散恢復或未知'
		END AS recovery_type
	FROM events e
),
summary AS (
	SELECT
		recovery_type,
		count(*) AS episodes,
		count(*) AS recovered_episodes,
		count(*)::double precision / NULLIF((SELECT count(*) + (SELECT episodes FROM unrecovered) FROM classified), 0) * 100 AS share,
		percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes_to_recovery) AS median_minutes_to_recovery,
		avg(minutes_to_recovery) AS average_minutes_to_recovery,
		sum(total_increase) AS total_increase,
		sum(available_increase) AS available_increase
	FROM classified
	GROUP BY 1
	UNION ALL
	SELECT
		'觀測窗內未恢復' AS recovery_type,
		episodes,
		0 AS recovered_episodes,
		episodes::double precision / NULLIF((SELECT count(*) + episodes FROM classified), 0) * 100 AS share,
		NULL AS median_minutes_to_recovery,
		NULL AS average_minutes_to_recovery,
		0 AS total_increase,
		0 AS available_increase
	FROM unrecovered
	WHERE episodes > 0
),
by_campus AS (
	SELECT
		campus,
		recovery_type,
		count(*) AS episodes
	FROM classified
	GROUP BY 1, 2
),
station_events AS (
	SELECT
		station_name,
		campus,
		count(*) AS suspected_rebalance_events
	FROM classified
	WHERE recovery_type = '大量回補'
	GROUP BY 1, 2
	ORDER BY suspected_rebalance_events DESC, station_name
	LIMIT 10
),
examples AS (
	SELECT
		station_name,
		campus,
		recovery_type,
		recovery_local_bucket,
		start_total,
		recovery_total,
		start_available,
		recovery_available,
		total_increase,
		available_increase,
		minutes_to_recovery
	FROM classified
	ORDER BY
		CASE recovery_type WHEN '大量回補' THEN 1 WHEN '換電/修復' THEN 2 WHEN '一般歸還' THEN 3 ELSE 4 END,
		recovery_available DESC,
		recovery_local_bucket
	LIMIT 12
)
SELECT jsonb_pretty(jsonb_build_object(
	'recoverySummary', (SELECT jsonb_agg(to_jsonb(summary) ORDER BY episodes DESC) FROM summary),
	'recoveryByCampus', (SELECT jsonb_agg(to_jsonb(by_campus) ORDER BY campus, recovery_type) FROM by_campus),
	'rebalanceStations', (SELECT jsonb_agg(to_jsonb(station_events) ORDER BY suspected_rebalance_events DESC) FROM station_events),
	'recoveryExamples', (SELECT jsonb_agg(to_jsonb(examples) ORDER BY recovery_type, recovery_local_bucket) FROM examples)
));
`;

const buildMergedStatus = chunkResults => {
	const batteryByBand = new Map();
	const errorsByMessage = new Map();
	const reasonsByName = new Map();
	const signalSummary = {
		status_observations: 0,
		risk_signal_observations: 0,
		low_battery_observations: 0,
		error_observations: 0,
		fault_observations: 0,
		gps_abnormal_observations: 0
	};

	for (const result of chunkResults) {
		addFields(signalSummary, result?.signalSummary, Object.keys(signalSummary));
		mergeRows(batteryByBand, result?.batteryBands, row => String(row.band), ["band", "sort_order"], ["total_observations", "risk_signal_observations", "error_observations"]);
		mergeRows(errorsByMessage, result?.errorMessages, row => String(row.error_msg), ["error_msg"], ["observations"]);
		mergeRows(reasonsByName, result?.reasonSignals, row => String(row.reason), ["reason"], ["observations"]);
	}

	signalSummary.risk_signal_rate = percentage(signalSummary.risk_signal_observations, signalSummary.status_observations);

	const batteryBands = Array.from(batteryByBand.values())
		.map(row => ({
			...row,
			total_observations: Math.round(row.total_observations),
			risk_signal_observations: Math.round(row.risk_signal_observations),
			error_observations: Math.round(row.error_observations),
			risk_signal_rate: percentage(row.risk_signal_observations, row.total_observations)
		}))
		.sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order));

	const errorMessages = Array.from(errorsByMessage.values())
		.map(row => ({
			...row,
			observations: Math.round(row.observations),
			share_of_all: percentage(row.observations, signalSummary.status_observations),
			share_of_signal_observations: percentage(row.observations, signalSummary.risk_signal_observations)
		}))
		.sort((a, b) => b.observations - a.observations)
		.slice(0, 20);

	const reasonSignals = Array.from(reasonsByName.values())
		.map(row => ({
			...row,
			observations: Math.round(row.observations),
			share_of_signal_observations: percentage(row.observations, signalSummary.risk_signal_observations)
		}))
		.sort((a, b) => b.observations - a.observations)
		.slice(0, 12);

	return { signalSummary, batteryBands, errorMessages, reasonSignals };
};

const buildMergedBatteryAvailability = chunkResults => {
	const bandsByName = new Map();
	const thresholdByValue = new Map();
	const unavailableErrorByMessage = new Map();
	const campusByName = new Map();
	const summary = {
		joined_observations: 0,
		unavailable_observations: 0,
		available_observations: 0,
		unavailable_low_30_observations: 0,
		unavailable_low_35_observations: 0,
		unavailable_low_40_observations: 0,
		unavailable_error_observations: 0,
		unavailable_fault_observations: 0,
		unavailable_gps_abnormal_observations: 0
	};

	for (const result of chunkResults) {
		addFields(summary, result?.batteryAvailabilitySummary, Object.keys(summary));
		mergeRows(
			bandsByName,
			result?.batteryAvailabilityBands,
			row => String(row.band),
			["band", "sort_order"],
			["total_observations", "unavailable_observations", "error_observations", "unavailable_error_observations"]
		);
		mergeRows(
			thresholdByValue,
			result?.batteryThresholdCandidates,
			row => String(row.threshold),
			["threshold"],
			["total_observations", "under_threshold_observations", "unavailable_observations", "unavailable_under_threshold_observations"]
		);
		mergeRows(unavailableErrorByMessage, result?.unavailableErrorMessages, row => String(row.error_msg), ["error_msg"], ["observations"]);
		mergeRows(campusByName, result?.batteryAvailabilityByCampus, row => String(row.campus), ["campus"], ["total_observations", "unavailable_observations", "unavailable_low_35_observations"]);
	}

	summary.unavailable_rate = percentage(summary.unavailable_observations, summary.joined_observations);
	summary.low_30_share_of_unavailable = percentage(summary.unavailable_low_30_observations, summary.unavailable_observations);
	summary.low_35_share_of_unavailable = percentage(summary.unavailable_low_35_observations, summary.unavailable_observations);
	summary.low_40_share_of_unavailable = percentage(summary.unavailable_low_40_observations, summary.unavailable_observations);
	summary.error_share_of_unavailable = percentage(summary.unavailable_error_observations, summary.unavailable_observations);

	const batteryAvailabilityBands = Array.from(bandsByName.values())
		.map(row => {
			const interval = wilsonInterval(row.unavailable_observations, row.total_observations);
			return {
				...row,
				total_observations: Math.round(row.total_observations),
				unavailable_observations: Math.round(row.unavailable_observations),
				error_observations: Math.round(row.error_observations),
				unavailable_error_observations: Math.round(row.unavailable_error_observations),
				unavailable_rate: percentage(row.unavailable_observations, row.total_observations),
				ci_low: interval.low,
				ci_high: interval.high
			};
		})
		.sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order));

	const batteryThresholdCandidates = Array.from(thresholdByValue.values())
		.map(row => ({
			...row,
			total_observations: Math.round(row.total_observations),
			under_threshold_observations: Math.round(row.under_threshold_observations),
			unavailable_observations: Math.round(row.unavailable_observations),
			unavailable_under_threshold_observations: Math.round(row.unavailable_under_threshold_observations),
			under_threshold_share_of_all: percentage(row.under_threshold_observations, row.total_observations),
			unavailable_rate_under_threshold: percentage(row.unavailable_under_threshold_observations, row.under_threshold_observations),
			share_of_unavailable: percentage(row.unavailable_under_threshold_observations, row.unavailable_observations)
		}))
		.sort((a, b) => numberValue(a.threshold) - numberValue(b.threshold));

	const unavailableErrorMessages = Array.from(unavailableErrorByMessage.values())
		.map(row => ({
			...row,
			observations: Math.round(row.observations),
			share_of_unavailable: percentage(row.observations, summary.unavailable_observations)
		}))
		.sort((a, b) => b.observations - a.observations)
		.slice(0, 20);

	const batteryAvailabilityByCampus = Array.from(campusByName.values())
		.map(row => ({
			...row,
			total_observations: Math.round(row.total_observations),
			unavailable_observations: Math.round(row.unavailable_observations),
			unavailable_low_35_observations: Math.round(row.unavailable_low_35_observations),
			unavailable_rate: percentage(row.unavailable_observations, row.total_observations),
			low_35_share_of_unavailable: percentage(row.unavailable_low_35_observations, row.unavailable_observations)
		}))
		.sort((a, b) => String(a.campus).localeCompare(String(b.campus), "zh-Hant"));

	return { batteryAvailabilitySummary: summary, batteryAvailabilityBands, batteryThresholdCandidates, unavailableErrorMessages, batteryAvailabilityByCampus };
};

const buildStatisticalTests = comparisonCounts => {
	const campusRows = asArray(comparisonCounts?.campus);
	const weekdayRows = asArray(comparisonCounts?.weekday);
	const campus = label => campusRows.find(row => row.label === label);
	const weekday = (campusName, weekdayName) => weekdayRows.find(row => row.campus === campusName && row.weekday === weekdayName);
	const tests = [];

	const nthu = campus("清大");
	const nctu = campus("交大");
	if (nthu && nctu) {
		tests.push(
			twoProportionTest({
				name: "清大與交大缺車率比較",
				hypothesis: "H0：清大與交大的缺車率相同；H1：兩校區缺車率不同。",
				groupA: nthu,
				groupB: nctu,
				eventField: "shortage"
			})
		);
		tests.push(
			twoProportionTest({
				name: "清大與交大低庫存率比較",
				hypothesis: "H0：清大與交大的低庫存率相同；H1：兩校區低庫存率不同。",
				groupA: nthu,
				groupB: nctu,
				eventField: "low_stock"
			})
		);
	}

	for (const campusName of ["清大", "交大"]) {
		const monday = weekday(campusName, "星期一");
		const friday = weekday(campusName, "星期五");
		if (!monday || !friday) continue;

		tests.push(
			twoProportionTest({
				name: `${campusName}星期一與星期五缺車率比較`,
				hypothesis: `H0：${campusName}星期一與星期五缺車率相同；H1：兩天缺車率不同。`,
				groupA: friday,
				groupB: monday,
				eventField: "shortage"
			})
		);
		tests.push(
			twoProportionTest({
				name: `${campusName}星期一與星期五低庫存率比較`,
				hypothesis: `H0：${campusName}星期一與星期五低庫存率相同；H1：兩天低庫存率不同。`,
				groupA: friday,
				groupB: monday,
				eventField: "low_stock"
			})
		);
	}

	return tests;
};

const clipRanges = (ranges, startIso, endIso) => {
	const start = new Date(startIso).getTime();
	const end = new Date(endIso).getTime();

	return asArray(ranges)
		.map(range => {
			const rangeStart = new Date(range.startIso).getTime();
			const rangeEnd = new Date(range.endIso).getTime();
			const clippedStart = Math.max(start, rangeStart);
			const clippedEnd = Math.min(end, rangeEnd);
			return clippedStart < clippedEnd
				? {
						...range,
						startIso: new Date(clippedStart).toISOString(),
						endIso: new Date(clippedEnd).toISOString()
					}
				: null;
		})
		.filter(Boolean);
};

const splitRanges = (ranges, hours) => {
	const segmentMs = Math.max(1, Number.isFinite(hours) ? hours : 12) * 60 * 60 * 1000;

	return asArray(ranges).flatMap(range => {
		const start = new Date(range.startIso).getTime();
		const end = new Date(range.endIso).getTime();
		const segments = [];
		let cursor = start;
		let segmentIndex = 1;

		while (cursor < end) {
			const segmentEnd = Math.min(end, cursor + segmentMs);
			segments.push({
				...range,
				chunkName: `${range.chunkName}:${segmentIndex}`,
				startIso: new Date(cursor).toISOString(),
				endIso: new Date(segmentEnd).toISOString()
			});
			cursor = segmentEnd;
			segmentIndex += 1;
		}

		return segments;
	});
};

const sampleRanges = (ranges, everyHours, sampleMinutes) => {
	const stepMs = Math.max(0.25, Number.isFinite(everyHours) ? everyHours : 6) * 60 * 60 * 1000;
	const durationMs = Math.max(1, Number.isFinite(sampleMinutes) ? sampleMinutes : 15) * 60 * 1000;

	return asArray(ranges).flatMap(range => {
		const start = new Date(range.startIso).getTime();
		const end = new Date(range.endIso).getTime();
		const samples = [];
		let cursor = start;
		let sampleIndex = 1;

		while (cursor < end) {
			const sampleEnd = Math.min(end, cursor + durationMs);
			if (sampleEnd > cursor) {
				samples.push({
					...range,
					chunkName: `${range.chunkName}:sample-${sampleIndex}`,
					startIso: new Date(cursor).toISOString(),
					endIso: new Date(sampleEnd).toISOString()
				});
			}
			cursor += stepMs;
			sampleIndex += 1;
		}

		return samples;
	});
};

console.error(`Fetching final report data from ${sshHost}:${remoteDir}`);
const station = psql(stationSql);
console.error("Fetched station, concentration, and comparison aggregates");

const clippedStatusRanges = clipRanges(psql(statusRangesSql), station.metadata.data_start_utc, station.metadata.data_end_utc);
const statusRanges = splitRanges(clippedStatusRanges, rangeHours);
const batteryRanges = sampleRanges(clippedStatusRanges, batterySampleEveryHours, batterySampleMinutes);
const workerCount = Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2;

let status;
if (reuseStatus && existingData?.signalSummary && existingData?.batteryBands && existingData?.errorMessages && existingData?.reasonSignals) {
	status = {
		signalSummary: existingData.signalSummary,
		batteryBands: existingData.batteryBands,
		errorMessages: existingData.errorMessages,
		reasonSignals: existingData.reasonSignals
	};
	console.error("Reused existing status-signal aggregates from current report-data.generated.json");
} else {
	console.error(`Fetching ${statusRanges.length} status-signal chunks with concurrency ${workerCount}`);
	const statusChunks = await runWithConcurrency(statusRanges, workerCount, async (range, index) => {
		console.error(`Fetching status-signal aggregates for ${range.chunkName} (${index + 1}/${statusRanges.length})`);
		const result = await psqlAsync(statusSignalSqlForRange(range.startIso, range.endIso));
		console.error(`Fetched status-signal aggregates for ${range.chunkName}`);
		return result;
	});
	status = buildMergedStatus(statusChunks);
	console.error("Merged status-signal aggregates");
}

console.error(`Fetching ${batteryRanges.length} battery-availability samples (${batterySampleMinutes} minutes every ${batterySampleEveryHours} hours) with concurrency ${workerCount}`);
const batteryAvailabilityChunks = await runWithConcurrency(batteryRanges, workerCount, async (range, index) => {
	console.error(`Fetching battery availability for ${range.chunkName} (${index + 1}/${batteryRanges.length})`);
	const result = await psqlAsync(batteryAvailabilitySqlForRange(range.startIso, range.endIso));
	console.error(`Fetched battery availability for ${range.chunkName}`);
	return result;
});
const batteryAvailability = buildMergedBatteryAvailability(batteryAvailabilityChunks);
batteryAvailability.batteryAvailabilitySummary.sample_minutes = batterySampleMinutes;
batteryAvailability.batteryAvailabilitySummary.sample_every_hours = batterySampleEveryHours;
batteryAvailability.batteryAvailabilitySummary.sample_windows = batteryRanges.length;
console.error("Merged battery availability aggregates");

const recovery = psql(recoverySql);
console.error("Fetched recovery classification aggregates");

const statisticalTests = buildStatisticalTests(station.comparisonCounts);
console.error("Built statistical tests");

const routes = {
	routeMeta: {
		total_transitions: 0,
		transitions_excluding_low_battery: 0,
		usable: false
	},
	routeRisks: [],
	routeLimitation: "車輛層級路線故障需要把 scooter_info_observations 與 scooter_status_observations 以同車、同時間可靠對齊；本次改以站點集中度與缺車恢復分類回答借車策略，未把路線故障率當作主要結論。"
};

const generated = {
	generatedAt: new Date().toISOString(),
	source: {
		sshHost,
		remoteDir,
		dbContainer,
		database: "where-is-oloo docker compose db / oloo",
		exportScript: "apps/report/scripts/export-final-report-data.mjs"
	},
	...station,
	...status,
	...batteryAvailability,
	...recovery,
	statisticalTests,
	...routes
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.error(`Wrote ${outputPath}`);
