import pg from "pg";

import type { Config } from "./config.js";

const { Pool } = pg;

export type Db = pg.Pool;
export type DbClient = pg.PoolClient;

export const createDb = (config: Config) =>
	new Pool({
		connectionString: config.databaseUrl,
		max: 10
	});

export const migrate = async (db: Db) => {
	await db.query(`
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS crawl_runs (
	id BIGSERIAL PRIMARY KEY,
	endpoint_name TEXT NOT NULL,
	mode TEXT NOT NULL,
	started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	finished_at TIMESTAMPTZ,
	status TEXT NOT NULL DEFAULT 'running',
	http_status INTEGER,
	item_count INTEGER,
	error TEXT
);

CREATE INDEX IF NOT EXISTS crawl_runs_endpoint_started_at_idx ON crawl_runs (endpoint_name, started_at DESC);

CREATE TABLE IF NOT EXISTS raw_endpoint_observations (
	observed_at TIMESTAMPTZ NOT NULL,
	endpoint_name TEXT NOT NULL,
	source_id TEXT NOT NULL,
	source_updated_at TIMESTAMPTZ,
	payload JSONB NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('raw_endpoint_observations', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS raw_endpoint_observations_endpoint_observed_at_idx ON raw_endpoint_observations (endpoint_name, observed_at DESC);
CREATE INDEX IF NOT EXISTS raw_endpoint_observations_source_idx ON raw_endpoint_observations (endpoint_name, source_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS raw_endpoint_observations_payload_gin_idx ON raw_endpoint_observations USING GIN (payload);

CREATE TABLE IF NOT EXISTS static_endpoint_items (
	endpoint_name TEXT NOT NULL,
	source_id TEXT NOT NULL,
	fetched_at TIMESTAMPTZ NOT NULL,
	source_updated_at TIMESTAMPTZ,
	payload JSONB NOT NULL,
	PRIMARY KEY (endpoint_name, source_id)
);

CREATE INDEX IF NOT EXISTS static_endpoint_items_payload_gin_idx ON static_endpoint_items USING GIN (payload);

CREATE TABLE IF NOT EXISTS scooter_info_observations (
	observed_at TIMESTAMPTZ NOT NULL,
	scooter_id INTEGER,
	engine_license_number TEXT,
	imei TEXT,
	vehicle_model TEXT,
	iccid TEXT,
	ble_mac TEXT,
	ble_key TEXT,
	iot_version TEXT,
	iot_build_time TEXT,
	controller_sn TEXT,
	controller_fw_version TEXT,
	escooter_sn TEXT,
	scooter_version TEXT,
	mobile_number TEXT,
	account_id INTEGER,
	is_active BOOLEAN,
	last_rental_started_at TIMESTAMPTZ,
	last_power_off_at TIMESTAMPTZ,
	total_meter DOUBLE PRECISION,
	last_ride_meter DOUBLE PRECISION,
	available_distance DOUBLE PRECISION,
	available_travel_time DOUBLE PRECISION,
	created_at TIMESTAMPTZ,
	scooter_rental_station_id INTEGER,
	scooter_rental_log_id INTEGER,
	source_updated_at TIMESTAMPTZ,
	raw JSONB NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('scooter_info_observations', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS scooter_info_observations_imei_idx ON scooter_info_observations (imei, observed_at DESC);
CREATE INDEX IF NOT EXISTS scooter_info_observations_station_idx ON scooter_info_observations (scooter_rental_station_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS scooter_info_observations_rented_idx ON scooter_info_observations (observed_at DESC) WHERE account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS scooter_status_observations (
	observed_at TIMESTAMPTZ NOT NULL,
	status_id INTEGER,
	imei TEXT,
	msg_type TEXT,
	latitude DOUBLE PRECISION,
	longitude DOUBLE PRECISION,
	power INTEGER,
	lock_status BOOLEAN,
	gsm INTEGER,
	charge_status BOOLEAN,
	error_msg TEXT,
	warning_status INTEGER,
	fault_status INTEGER,
	speed DOUBLE PRECISION,
	speed_mode INTEGER,
	power1 DOUBLE PRECISION,
	power2 DOUBLE PRECISION,
	head_light INTEGER,
	tail_light_twinking INTEGER,
	accelerator_response INTEGER,
	inch_speed INTEGER,
	cruise_speed DOUBLE PRECISION,
	button_change_mode INTEGER,
	button_switch_headlight_mode INTEGER,
	low_speed_limit DOUBLE PRECISION,
	medium_speed_limit DOUBLE PRECISION,
	high_speed_limit DOUBLE PRECISION,
	start_type INTEGER,
	power_status INTEGER,
	battery_lock_status INTEGER,
	gps_number INTEGER,
	hdop DOUBLE PRECISION,
	rfid_time TIMESTAMPTZ,
	device_timestamp TEXT,
	utc_date TEXT,
	utc_time TEXT,
	n_or_s TEXT,
	e_or_w TEXT,
	iot_accelerometer_sensitivity INTEGER,
	upload_in_ride INTEGER,
	upload_in_ride_interval INTEGER,
	heart_interval INTEGER,
	rfid_id INTEGER,
	created_at TIMESTAMPTZ,
	source_updated_at TIMESTAMPTZ,
	raw JSONB NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('scooter_status_observations', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS scooter_status_observations_imei_idx ON scooter_status_observations (imei, observed_at DESC);
CREATE INDEX IF NOT EXISTS scooter_status_observations_location_idx ON scooter_status_observations (observed_at DESC) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS station_scooter_counts (
	observed_at TIMESTAMPTZ NOT NULL,
	station_id INTEGER,
	scooter_count INTEGER NOT NULL,
	active_scooter_count INTEGER NOT NULL,
	available_scooter_count INTEGER NOT NULL,
	rented_scooter_count INTEGER NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('station_scooter_counts', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS station_scooter_counts_station_idx ON station_scooter_counts (station_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_info_observations (
	observed_at TIMESTAMPTZ NOT NULL,
	vehicle_id INTEGER,
	engine_license_number TEXT,
	vehicle_model TEXT,
	modem_id TEXT,
	imei TEXT,
	mobile_number TEXT,
	ccid TEXT,
	available_distance DOUBLE PRECISION,
	available_travel_time DOUBLE PRECISION,
	account_id INTEGER,
	is_active BOOLEAN,
	last_rental_started_at TIMESTAMPTZ,
	last_power_off_at TIMESTAMPTZ,
	rental_station_id INTEGER,
	rental_id INTEGER,
	created_at TIMESTAMPTZ,
	source_updated_at TIMESTAMPTZ,
	raw JSONB NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('vehicle_info_observations', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS vehicle_info_observations_imei_idx ON vehicle_info_observations (imei, observed_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_status_observations (
	observed_at TIMESTAMPTZ NOT NULL,
	status_id INTEGER,
	msg_type TEXT,
	modem_id TEXT,
	transaction_id TEXT,
	message_id TEXT,
	gps_time TIMESTAMPTZ,
	latitude DOUBLE PRECISION,
	longitude DOUBLE PRECISION,
	altitude DOUBLE PRECISION,
	speed DOUBLE PRECISION,
	direction DOUBLE PRECISION,
	odometer DOUBLE PRECISION,
	hdop DOUBLE PRECISION,
	satellites INTEGER,
	io_input INTEGER,
	io_output INTEGER,
	vehicle_status INTEGER,
	main_power DOUBLE PRECISION,
	battery_power DOUBLE PRECISION,
	rtc_time TIMESTAMPTZ,
	sending_time TIMESTAMPTZ,
	csq INTEGER,
	engine_rpm DOUBLE PRECISION,
	vehicle_speed DOUBLE PRECISION,
	fuel_level_input DOUBLE PRECISION,
	obd_odometer DOUBLE PRECISION,
	mcu_motor_rpm DOUBLE PRECISION,
	obd_speed DOUBLE PRECISION,
	bms_batt_soc DOUBLE PRECISION,
	mtr_odo_data DOUBLE PRECISION,
	bcm_power_distribution_status DOUBLE PRECISION,
	bms_charging_status INTEGER,
	last_charge_time TIMESTAMPTZ,
	created_at TIMESTAMPTZ,
	source_updated_at TIMESTAMPTZ,
	raw JSONB NOT NULL,
	crawl_run_id BIGINT REFERENCES crawl_runs (id)
);

SELECT create_hypertable('vehicle_status_observations', 'observed_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS vehicle_status_observations_modem_idx ON vehicle_status_observations (modem_id, observed_at DESC);

CREATE OR REPLACE VIEW latest_scooter_info AS
SELECT DISTINCT ON (imei) *
FROM scooter_info_observations
WHERE imei IS NOT NULL
ORDER BY imei, observed_at DESC;

CREATE OR REPLACE VIEW latest_scooter_status AS
SELECT DISTINCT ON (imei) *
FROM scooter_status_observations
WHERE imei IS NOT NULL
ORDER BY imei, observed_at DESC;

CREATE OR REPLACE VIEW current_scooter_locations AS
SELECT
	i.observed_at AS info_observed_at,
	s.observed_at AS status_observed_at,
	i.scooter_id,
	i.engine_license_number,
	i.imei,
	i.account_id IS NOT NULL AS is_rented,
	i.is_active,
	i.scooter_rental_station_id,
	s.msg_type,
	s.latitude,
	s.longitude,
	s.power,
	s.lock_status,
	s.speed,
	s.source_updated_at AS status_updated_at
FROM latest_scooter_info i
LEFT JOIN latest_scooter_status s ON s.imei = i.imei;

CREATE OR REPLACE VIEW current_station_scooter_counts AS
SELECT DISTINCT ON (station_id) *
FROM station_scooter_counts
ORDER BY station_id NULLS LAST, observed_at DESC;
`);
};

export const insertRows = async (client: DbClient, table: string, columns: string[], rows: unknown[][], chunkSize = 500) => {
	if (rows.length === 0) return;

	for (let start = 0; start < rows.length; start += chunkSize) {
		const chunk = rows.slice(start, start + chunkSize);
		const values: unknown[] = [];
		const placeholders = chunk.map((row, rowIndex) => {
			const rowPlaceholders = row.map(value => {
				values.push(value);
				return `$${values.length}`;
			});

			return `(${rowPlaceholders.join(", ")})`;
		});

		await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`, values);
	}
};
