export type EndpointMode = "snapshot" | "static";

export type EndpointDefinition = {
	name: string;
	title: string;
	url: string;
	mode: EndpointMode;
};

const baseUrl = "https://looplus-api-staging.loopluscooter.com/nest/api";

export const endpoints: EndpointDefinition[] = [
	{
		name: "oloo-options",
		title: "oloo 文案",
		url: `${baseUrl}/oloo-options`,
		mode: "static"
	},
	{
		name: "vehicles-infos",
		title: "車輛資訊",
		url: `${baseUrl}/vehicles-infos`,
		mode: "snapshot"
	},
	{
		name: "vehicle-statuses",
		title: "車輛狀態",
		url: `${baseUrl}/vehicle-statuses`,
		mode: "snapshot"
	},
	{
		name: "scooters-infos",
		title: "滑板車資訊",
		url: `${baseUrl}/scooters-infos`,
		mode: "snapshot"
	},
	{
		name: "scooter-statuses",
		title: "滑板車狀態",
		url: `${baseUrl}/scooter-statuses`,
		mode: "snapshot"
	},
	{
		name: "scooter-rental-stations-active-stations",
		title: "可用租借站",
		url: `${baseUrl}/scooter-rental-stations/active-stations`,
		mode: "static"
	},
	{
		name: "location-meta-multi-feature-efences",
		title: "多 feature 電子圍籬",
		url: `${baseUrl}/location-meta/multi-feature-efences`,
		mode: "static"
	},
	{
		name: "location-meta-cache-efence-display-ranges",
		title: "電子圍籬顯示範圍快取",
		url: `${baseUrl}/location-meta/cache/efence-display-ranges`,
		mode: "static"
	}
];

export const dynamicEndpoints = endpoints.filter(endpoint => endpoint.mode === "snapshot");
export const staticEndpoints = endpoints.filter(endpoint => endpoint.mode === "static");
