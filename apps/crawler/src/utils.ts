import { createHash } from "node:crypto";

export type JsonObject = Record<string, unknown>;

export const toItems = (payload: unknown): JsonObject[] => {
	if (Array.isArray(payload)) {
		return payload.filter((item): item is JsonObject => isJsonObject(item));
	}

	return isJsonObject(payload) ? [payload] : [];
};

export const isJsonObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

export const getSourceId = (item: JsonObject, fallbackPrefix: string) => {
	const candidates = ["id", "imei", "IMEI", "ModemID", "stationNumber", "name", "locationId"];

	for (const key of candidates) {
		const value = item[key];
		if (value !== undefined && value !== null && value !== "") return String(value);
	}

	return `${fallbackPrefix}:${createHash("sha1").update(JSON.stringify(item)).digest("hex")}`;
};

export const parseNumber = (value: unknown): number | null => {
	if (value === null || value === undefined || value === "") return null;

	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export const parseInteger = (value: unknown): number | null => {
	const parsed = parseNumber(value);
	return parsed === null ? null : Math.trunc(parsed);
};

export const parseBoolean = (value: unknown): boolean | null => {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return null;
};

export const parseTimestamp = (value: unknown): string | null => {
	if (typeof value !== "string" || value.length === 0) return null;

	const time = Date.parse(value);
	return Number.isFinite(time) ? new Date(time).toISOString() : null;
};
