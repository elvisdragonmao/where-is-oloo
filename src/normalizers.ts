import type { DbClient } from "./db.js";
import { insertRows } from "./db.js";
import type { JsonObject } from "./utils.js";
import { parseBoolean, parseInteger, parseNumber, parseTimestamp } from "./utils.js";

export const insertNormalizedObservations = async (client: DbClient, endpointName: string, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	switch (endpointName) {
		case "scooters-infos":
			await insertScooterInfos(client, observedAt, crawlRunId, items);
			await insertStationScooterCounts(client, observedAt, crawlRunId, items);
			return;
		case "scooter-statuses":
			await insertScooterStatuses(client, observedAt, crawlRunId, items);
			return;
		case "vehicles-infos":
			await insertVehicleInfos(client, observedAt, crawlRunId, items);
			return;
		case "vehicle-statuses":
			await insertVehicleStatuses(client, observedAt, crawlRunId, items);
			return;
	}
};

const insertScooterInfos = async (client: DbClient, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	await insertRows(
		client,
		"scooter_info_observations",
		[
			"observed_at",
			"scooter_id",
			"engine_license_number",
			"imei",
			"vehicle_model",
			"iccid",
			"ble_mac",
			"ble_key",
			"iot_version",
			"iot_build_time",
			"controller_sn",
			"controller_fw_version",
			"escooter_sn",
			"scooter_version",
			"mobile_number",
			"account_id",
			"is_active",
			"last_rental_started_at",
			"last_power_off_at",
			"total_meter",
			"last_ride_meter",
			"available_distance",
			"available_travel_time",
			"created_at",
			"scooter_rental_station_id",
			"scooter_rental_log_id",
			"source_updated_at",
			"raw",
			"crawl_run_id"
		],
		items.map(item => [
			observedAt,
			parseInteger(item.id),
			toText(item.EngineLicenseNumber),
			toText(item.imei),
			toText(item.VehicleModel),
			toText(item.iccid),
			toText(item.bleMAC),
			toText(item.bleKey),
			toText(item.iotVersion),
			toText(item.iotBuildTime),
			toText(item.controllerSN),
			toText(item.controllerFwVersion),
			toText(item.escooterSN),
			toText(item.scooterVersion),
			toText(item.mobileNumber),
			parseInteger(item.accountId),
			parseBoolean(item.isActive),
			parseTimestamp(item.lastRentalStartedAt),
			parseTimestamp(item.lastPowerOffAt),
			parseNumber(item.totalMeter),
			parseNumber(item.lastRideMeter),
			parseNumber(item.AvailableDistance),
			parseNumber(item.AvailableTravelTime),
			parseTimestamp(item.createdAt),
			parseInteger(item.scooterRentalStationId),
			parseInteger(item.scooterRentalLogId),
			parseTimestamp(item.updatedAt),
			JSON.stringify(item),
			crawlRunId
		])
	);
};

const insertScooterStatuses = async (client: DbClient, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	await insertRows(
		client,
		"scooter_status_observations",
		[
			"observed_at",
			"status_id",
			"imei",
			"msg_type",
			"latitude",
			"longitude",
			"power",
			"lock_status",
			"gsm",
			"charge_status",
			"error_msg",
			"warning_status",
			"fault_status",
			"speed",
			"speed_mode",
			"power1",
			"power2",
			"head_light",
			"tail_light_twinking",
			"accelerator_response",
			"inch_speed",
			"cruise_speed",
			"button_change_mode",
			"button_switch_headlight_mode",
			"low_speed_limit",
			"medium_speed_limit",
			"high_speed_limit",
			"start_type",
			"power_status",
			"battery_lock_status",
			"gps_number",
			"hdop",
			"rfid_time",
			"device_timestamp",
			"utc_date",
			"utc_time",
			"n_or_s",
			"e_or_w",
			"iot_accelerometer_sensitivity",
			"upload_in_ride",
			"upload_in_ride_interval",
			"heart_interval",
			"rfid_id",
			"created_at",
			"source_updated_at",
			"raw",
			"crawl_run_id"
		],
		items.map(item => [
			observedAt,
			parseInteger(item.id),
			toText(item.imei),
			toText(item.msgType),
			parseNumber(item.latitude),
			parseNumber(item.longitude),
			parseInteger(item.power),
			parseBoolean(item.lockStatus),
			parseInteger(item.gsm),
			parseBoolean(item.chargeStatus),
			toText(item.errorMsg),
			parseInteger(item.warningStatus),
			parseInteger(item.faultStatus),
			parseNumber(item.speed),
			parseInteger(item.speedMode),
			parseNumber(item.power1),
			parseNumber(item.power2),
			parseInteger(item.headLight),
			parseInteger(item.tailLightTwinking),
			parseInteger(item.acceleratorResponse),
			parseInteger(item.inchSpeed),
			parseNumber(item.cruiseSpeed),
			parseInteger(item.buttonChangeMode),
			parseInteger(item.buttonSwitchHeadlightMode),
			parseNumber(item.lowSpeedLimit),
			parseNumber(item.mediumSpeedLimit),
			parseNumber(item.highSpeedLimit),
			parseInteger(item.startType),
			parseInteger(item.powerStatus),
			parseInteger(item.batteryLockStatus),
			parseInteger(item.gpsNumber),
			parseNumber(item.hdop),
			parseTimestamp(item.rfidTime),
			toText(item.timeStamp),
			toText(item.utcDate),
			toText(item.utcTime),
			toText(item.nOrS),
			toText(item.eOrW),
			parseInteger(item.iotAccelerometerSensitivity),
			parseInteger(item.uploadInRide),
			parseInteger(item.uploadInRideInterval),
			parseInteger(item.heartInterval),
			parseInteger(item.rfidId),
			parseTimestamp(item.createdAt),
			parseTimestamp(item.updatedAt),
			JSON.stringify(item),
			crawlRunId
		])
	);
};

const insertStationScooterCounts = async (client: DbClient, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	type Count = {
		scooterCount: number;
		activeScooterCount: number;
		availableScooterCount: number;
		rentedScooterCount: number;
	};

	const counts = new Map<string, Count>();

	for (const item of items) {
		const stationId = parseInteger(item.scooterRentalStationId);
		const key = stationId === null ? "__null__" : String(stationId);
		const count = counts.get(key) ?? { scooterCount: 0, activeScooterCount: 0, availableScooterCount: 0, rentedScooterCount: 0 };
		const isActive = parseBoolean(item.isActive) === true;
		const isRented = item.accountId !== null && item.accountId !== undefined;

		count.scooterCount += 1;
		if (isActive) count.activeScooterCount += 1;
		if (isActive && !isRented) count.availableScooterCount += 1;
		if (isRented) count.rentedScooterCount += 1;
		counts.set(key, count);
	}

	await insertRows(
		client,
		"station_scooter_counts",
		["observed_at", "station_id", "scooter_count", "active_scooter_count", "available_scooter_count", "rented_scooter_count", "crawl_run_id"],
		Array.from(counts.entries()).map(([stationId, count]) => [
			observedAt,
			stationId === "__null__" ? null : Number.parseInt(stationId, 10),
			count.scooterCount,
			count.activeScooterCount,
			count.availableScooterCount,
			count.rentedScooterCount,
			crawlRunId
		])
	);
};

const insertVehicleInfos = async (client: DbClient, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	await insertRows(
		client,
		"vehicle_info_observations",
		[
			"observed_at",
			"vehicle_id",
			"engine_license_number",
			"vehicle_model",
			"modem_id",
			"imei",
			"mobile_number",
			"ccid",
			"available_distance",
			"available_travel_time",
			"account_id",
			"is_active",
			"last_rental_started_at",
			"last_power_off_at",
			"rental_station_id",
			"rental_id",
			"created_at",
			"source_updated_at",
			"raw",
			"crawl_run_id"
		],
		items.map(item => [
			observedAt,
			parseInteger(item.id),
			toText(item.EngineLicenseNumber),
			toText(item.VehicleModel),
			toText(item.ModemID),
			toText(item.IMEI),
			toText(item.MobileNumber),
			toText(item.CCID),
			parseNumber(item.AvailableDistance),
			parseNumber(item.AvailableTravelTime),
			parseInteger(item.accountId),
			parseBoolean(item.isActive),
			parseTimestamp(item.lastRentalStartedAt),
			parseTimestamp(item.lastPowerOffAt),
			parseInteger(item.rentalStationId),
			parseInteger(item.rentalId),
			parseTimestamp(item.createdAt),
			parseTimestamp(item.updatedAt),
			JSON.stringify(item),
			crawlRunId
		])
	);
};

const insertVehicleStatuses = async (client: DbClient, observedAt: string, crawlRunId: number, items: JsonObject[]) => {
	await insertRows(
		client,
		"vehicle_status_observations",
		[
			"observed_at",
			"status_id",
			"msg_type",
			"modem_id",
			"transaction_id",
			"message_id",
			"gps_time",
			"latitude",
			"longitude",
			"altitude",
			"speed",
			"direction",
			"odometer",
			"hdop",
			"satellites",
			"io_input",
			"io_output",
			"vehicle_status",
			"main_power",
			"battery_power",
			"rtc_time",
			"sending_time",
			"csq",
			"engine_rpm",
			"vehicle_speed",
			"fuel_level_input",
			"obd_odometer",
			"mcu_motor_rpm",
			"obd_speed",
			"bms_batt_soc",
			"mtr_odo_data",
			"bcm_power_distribution_status",
			"bms_charging_status",
			"last_charge_time",
			"created_at",
			"source_updated_at",
			"raw",
			"crawl_run_id"
		],
		items.map(item => [
			observedAt,
			parseInteger(item.id),
			toText(item.MsgType),
			toText(item.ModemID),
			toText(item.TranscationID),
			toText(item.MessageID),
			parseTimestamp(item.GPSTime),
			parseNumber(item.Latitude),
			parseNumber(item.Longitude),
			parseNumber(item.Altitude),
			parseNumber(item.Speed),
			parseNumber(item.Direction),
			parseNumber(item.Odometer),
			parseNumber(item.HDOP),
			parseInteger(item.Satellites),
			parseInteger(item.IOInput),
			parseInteger(item.IOOutput),
			parseInteger(item.VehicleStatus),
			parseNumber(item.MainPower),
			parseNumber(item.BatteryPower),
			parseTimestamp(item.RTCTime),
			parseTimestamp(item.SendingTime),
			parseInteger(item.CSQ),
			parseNumber(item.EngineRPM),
			parseNumber(item.VehicleSpeed),
			parseNumber(item.FuelLevelInput),
			parseNumber(item.OBDOdometer),
			parseNumber(item.MCU_MOTOR_RPM),
			parseNumber(item.OBD_Speed),
			parseNumber(item.BMS_Batt_SOC),
			parseNumber(item.MTR_ODO_Data),
			parseNumber(item.BCM_PowerDistributionStatus),
			parseInteger(item.BMS_Charging_Status),
			parseTimestamp(item.LastChargeTime),
			parseTimestamp(item.createdAt),
			parseTimestamp(item.updatedAt),
			JSON.stringify(item),
			crawlRunId
		])
	);
};

const toText = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
