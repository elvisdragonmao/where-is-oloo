import generated from "./report-data.generated.json";

export type TableData = {
	caption: string;
	columns: string[];
	rows: string[][];
};

export type StrategyScope = "每日整體" | "星期一" | "星期五";

export type StrategyPoint = {
	hour: string;
	nthuTotal: number;
	nthuAvailable: number;
	nctuTotal: number;
	nctuAvailable: number;
	nthuShortageRate: number;
	nctuShortageRate: number;
};

export type CampusMetric = {
	campus: string;
	shortageRate: number;
	lowStockRate: number;
	totalAverage: number;
	availableAverage: number;
};

export type StationRisk = {
	station: string;
	campus: string;
	windows: string;
	shortageRate: number;
	emptyStationRate: number;
	unavailableWithVehicleRate: number;
	lowStockRate: number;
	totalAverage: number;
	availableAverage: number;
};

export type ReasonSignal = {
	reason: string;
	observations: number;
	share: number;
};

export type ErrorMessageCount = {
	message: string;
	observations: number;
	share: number;
};

export type BatteryBand = {
	band: string;
	total: number;
	unavailable: number;
	errorObservations: number;
	unavailableRate: number;
	ciLow: number;
	ciHigh: number;
};

export type RebalanceEvent = {
	station: string;
	campus: string;
	events: number;
	share: number;
};

export type RecoveryType = {
	type: string;
	episodes: number;
	share: number;
	recovered: number;
	medianMinutes: string;
	averageMinutes: string;
};

type GeneratedCampusHour = {
	campus: "清大" | "交大";
	hour: number;
	total_avg: number;
	available_avg: number;
	shortage_rate: number;
	low_stock_rate: number;
};

type GeneratedStrategy = GeneratedCampusHour & {
	scope: StrategyScope;
};

type GeneratedStationRisk = {
	campus: string;
	windows: number;
	total_avg: number;
	station_name: string;
	available_avg: number;
	shortage_rate: number;
	low_stock_rate: number;
	empty_station_rate: number;
	unavailable_with_vehicle_rate: number;
};

type GeneratedReasonSignal = {
	reason: string;
	observations: number;
	share_of_signal_observations: number;
};

type GeneratedErrorMessage = {
	error_msg: string;
	observations: number;
	share_of_all: number;
	share_of_signal_observations: number;
};

type GeneratedBatteryBand = {
	band: string;
	sort_order: number;
	total_observations: number;
	risk_signal_observations: number;
	error_observations: number;
	risk_signal_rate: number;
};

type GeneratedBatteryAvailabilityBand = {
	band: string;
	sort_order: number;
	total_observations: number;
	unavailable_observations: number;
	error_observations: number;
	unavailable_error_observations: number;
	unavailable_rate: number;
	ci_low: number;
	ci_high: number;
};

type GeneratedBatteryThreshold = {
	threshold: number;
	total_observations: number;
	under_threshold_observations: number;
	unavailable_observations: number;
	unavailable_under_threshold_observations: number;
	under_threshold_share_of_all: number;
	unavailable_rate_under_threshold: number;
	share_of_unavailable: number;
};

type GeneratedNightStationConcentration = {
	campus: string;
	station_name: string;
	share: number;
	station_rank: number;
	available_sum: number;
};

type GeneratedUnavailableErrorMessage = {
	error_msg: string;
	observations: number;
	share_of_unavailable: number;
};

type GeneratedRecoveryType = {
	recovery_type: string;
	episodes: number;
	share: number;
	recovered_episodes: number;
	median_minutes_to_recovery: number | null;
	average_minutes_to_recovery: number | null;
};

type GeneratedStatisticalTest = {
	name: string;
	hypothesis: string;
	metric: string;
	group_a: string;
	group_b: string;
	n_a: number;
	event_a: number;
	rate_a: number;
	n_b: number;
	event_b: number;
	rate_b: number;
	difference_percentage_points: number;
	ci_low: number;
	ci_high: number;
	z: number;
	p_value: number;
	conclusion: string;
};

type GeneratedRebalanceStation = {
	station_name: string;
	campus: string;
	suspected_rebalance_events: number;
};

type GeneratedReportData = {
	generatedAt: string;
	metadata: {
		data_start_at: string;
		data_end_at: string;
		station_count: number;
		station_windows: number;
	};
	campusHour: GeneratedCampusHour[];
	dailyStrategy: GeneratedStrategy[];
	stationRisk: GeneratedStationRisk[];
	nightStationConcentration: GeneratedNightStationConcentration[];
	signalSummary: {
		status_observations: number;
		risk_signal_observations: number;
		low_battery_observations: number;
		error_observations: number;
		fault_observations: number;
		gps_abnormal_observations: number;
	};
	batteryBands: GeneratedBatteryBand[];
	batteryAvailabilitySummary: {
		joined_observations: number;
		unavailable_observations: number;
		available_observations: number;
		unavailable_low_30_observations: number;
		unavailable_low_35_observations: number;
		unavailable_low_40_observations: number;
		unavailable_rate: number;
		low_30_share_of_unavailable: number;
		low_35_share_of_unavailable: number;
		low_40_share_of_unavailable: number;
		error_share_of_unavailable: number;
		sample_minutes: number;
		sample_every_hours: number;
		sample_windows: number;
	};
	batteryAvailabilityBands: GeneratedBatteryAvailabilityBand[];
	batteryThresholdCandidates: GeneratedBatteryThreshold[];
	unavailableErrorMessages: GeneratedUnavailableErrorMessage[];
	errorMessages: GeneratedErrorMessage[];
	reasonSignals: GeneratedReasonSignal[];
	recoverySummary: GeneratedRecoveryType[];
	rebalanceStations: GeneratedRebalanceStation[];
	statisticalTests: GeneratedStatisticalTest[];
	routeLimitation: string;
};

const data = generated as GeneratedReportData;
const campuses = ["清大", "交大"] as const;

const numberValue = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const round = (value: number, digits = 1) => {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
};
const percentText = (value: number, digits = 1) => `${round(value, digits).toFixed(digits)}%`;
const numberText = (value: number, digits = 0) => value.toLocaleString("zh-TW", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pValueText = (value: number) => (value < 0.000001 ? "<0.000001" : value.toFixed(6));
const hourText = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const minuteText = (value: number | null) => (value === null ? "NA" : `${numberText(value, 0)} 分鐘`);
const errorMsgTranslations: Record<string, string> = {
	illegalMovement: "異常移動",
	illegalDisassembly: "異常拆卸",
	throttleAbnormal: "油門異常",
	communicationError: "通訊錯誤",
	hallSensorAbnormal: "霍爾感測器異常",
	controllerUv: "控制器欠壓",
	motorHighTemperature: "馬達高溫",
	eFuseError: "電子保險絲錯誤",
	networkDisconnected: "網路斷線",
	motorPhaseOc: "馬達相線過電流",
	dcOcp: "直流過電流保護",
	motorRotationBlocked: "馬達堵轉",
	motorLossPhase: "馬達缺相",
	"4gModuleNoResponse": "4G 模組無回應"
};
const errorMsgText = (value: string) => {
	const translation = errorMsgTranslations[value];
	return translation ? `${value}（${translation}）` : value;
};
const recoveryTypeText = (value: string) => {
	if (value === "換電/修復代理") return "疑似換電或狀態修復";
	if (value === "觀測窗內未恢復") return "觀測期間未恢復";
	return value;
};

const dateTimeText = (value: string) => value.replace("T", " ").slice(0, 16);

export const reportMeta = {
	title: "清交校園 oloo 共享滑板車可用性分析",
	subtitle: "統計學期末報告",
	members: ["114550020 毛宥鈞", "614002201 蕭爾西", "214952036 曾靖雯", "214952056 吳承諺"],
	dateRange: `${dateTimeText(data.metadata.data_start_at)} 至 ${dateTimeText(data.metadata.data_end_at)}`,
	campuses: "清大、交大",
	window: "站點每 15 分鐘彙整一次；缺車恢復以 1 分鐘資料區間追蹤；車況 API 以原始狀態紀錄彙總",
	generatedAt: data.generatedAt
};

const groupAverage = (rows: GeneratedCampusHour[], pick: (row: GeneratedCampusHour) => number) => rows.reduce((sum, row) => sum + pick(row), 0) / Math.max(rows.length, 1);

export const campusMetrics: CampusMetric[] = campuses.map(campus => {
	const rows = data.campusHour.filter(row => row.campus === campus);
	return {
		campus,
		shortageRate: round(
			groupAverage(rows, row => row.shortage_rate),
			1
		),
		lowStockRate: round(
			groupAverage(rows, row => row.low_stock_rate),
			1
		),
		totalAverage: round(
			groupAverage(rows, row => row.total_avg),
			2
		),
		availableAverage: round(
			groupAverage(rows, row => row.available_avg),
			2
		)
	};
});

const rowFor = (scope: StrategyScope, campus: "清大" | "交大", hour: number) => data.dailyStrategy.find(row => row.scope === scope && row.campus === campus && row.hour === hour);

const strategyForScope = (scope: StrategyScope): StrategyPoint[] =>
	Array.from({ length: 24 }, (_, hour) => {
		const nthu = rowFor(scope, "清大", hour);
		const nctu = rowFor(scope, "交大", hour);
		return {
			hour: hourText(hour),
			nthuTotal: round(numberValue(nthu?.total_avg), 2),
			nthuAvailable: round(numberValue(nthu?.available_avg), 2),
			nctuTotal: round(numberValue(nctu?.total_avg), 2),
			nctuAvailable: round(numberValue(nctu?.available_avg), 2),
			nthuShortageRate: round(numberValue(nthu?.shortage_rate), 1),
			nctuShortageRate: round(numberValue(nctu?.shortage_rate), 1)
		};
	});

export const strategySeries: Record<StrategyScope, StrategyPoint[]> = {
	每日整體: strategyForScope("每日整體"),
	星期一: strategyForScope("星期一"),
	星期五: strategyForScope("星期五")
};

const bestHours = (scope: StrategyScope, campus: "清大" | "交大", count = 3) =>
	data.dailyStrategy
		.filter(row => row.scope === scope && row.campus === campus)
		.slice()
		.sort((a, b) => a.shortage_rate - b.shortage_rate || b.available_avg - a.available_avg)
		.slice(0, count)
		.map(row => hourText(row.hour));

const worstHours = (scope: StrategyScope, campus: "清大" | "交大", count = 3) =>
	data.dailyStrategy
		.filter(row => row.scope === scope && row.campus === campus)
		.slice()
		.sort((a, b) => b.shortage_rate - a.shortage_rate || a.available_avg - b.available_avg)
		.slice(0, count)
		.map(row => hourText(row.hour));

export const stationRisks: StationRisk[] = data.stationRisk.map(row => ({
	station: row.station_name,
	campus: row.campus,
	windows: numberText(row.windows),
	shortageRate: round(row.shortage_rate, 1),
	emptyStationRate: round(row.empty_station_rate, 1),
	unavailableWithVehicleRate: round(row.unavailable_with_vehicle_rate, 1),
	lowStockRate: round(row.low_stock_rate, 1),
	totalAverage: round(row.total_avg, 2),
	availableAverage: round(row.available_avg, 2)
}));

const unavailableVehicleErrorMessages = data.unavailableErrorMessages.filter(row => row.error_msg !== "Connection: close");

export const reasonSignals: ReasonSignal[] = [
	{
		reason: "低電量（<35%）",
		observations: data.batteryAvailabilitySummary.unavailable_low_35_observations,
		share: round(data.batteryAvailabilitySummary.low_35_share_of_unavailable, 2)
	},
	...unavailableVehicleErrorMessages.map(row => ({
		reason: row.error_msg,
		observations: row.observations,
		share: round(row.share_of_unavailable, 2)
	}))
].slice(0, 10);

export const errorMessages: ErrorMessageCount[] = unavailableVehicleErrorMessages.slice(0, 10).map(row => ({
	message: row.error_msg,
	observations: row.observations,
	share: round(row.share_of_unavailable, 2)
}));

export const batteryBands: BatteryBand[] = data.batteryAvailabilityBands
	.slice()
	.sort((a, b) => a.sort_order - b.sort_order)
	.map(row => ({
		band: row.band,
		total: row.total_observations,
		unavailable: row.unavailable_observations,
		errorObservations: row.error_observations,
		unavailableRate: round(row.unavailable_rate, 2),
		ciLow: round(row.ci_low, 2),
		ciHigh: round(row.ci_high, 2)
	}));

const threshold35 = data.batteryThresholdCandidates.find(row => row.threshold === 35);
const threshold30 = data.batteryThresholdCandidates.find(row => row.threshold === 30);
const nightTopNctu = data.nightStationConcentration.filter(row => row.campus === "交大").slice(0, 3);
const nightTopNctuShare = nightTopNctu.reduce((sum, row) => sum + numberValue(row.share), 0);

const totalRebalanceEvents = data.rebalanceStations.reduce((sum, row) => sum + row.suspected_rebalance_events, 0);

export const rebalanceEvents: RebalanceEvent[] = data.rebalanceStations.map(row => ({
	station: row.station_name,
	campus: row.campus,
	events: row.suspected_rebalance_events,
	share: round((row.suspected_rebalance_events / Math.max(totalRebalanceEvents, 1)) * 100, 1)
}));

export const recoveryTypes: RecoveryType[] = data.recoverySummary.map(row => ({
	type: recoveryTypeText(row.recovery_type),
	episodes: row.episodes,
	share: round(row.share, 1),
	recovered: row.recovered_episodes,
	medianMinutes: minuteText(row.median_minutes_to_recovery),
	averageMinutes: minuteText(row.average_minutes_to_recovery)
}));

export const introParagraphs = [
	`本報告透過每分鐘呼叫官方 API 蒐集並分析 ${reportMeta.dateRange} 的 oloo 清大、交大站點資料。分析重點不是單純數站點旁邊停了幾台車，而是學生實際會遇到的「借不到」：站點完全沒有可借車，或現場有車但系統顯示不可借。`,
	`站點層級結果顯示，清大平均缺車率約 ${percentText(campusMetrics.find(row => row.campus === "清大")?.shortageRate ?? 0)}，交大約 ${percentText(campusMetrics.find(row => row.campus === "交大")?.shortageRate ?? 0)}。最高風險站點是 ${stationRisks[0]?.station ?? "NA"}，缺車率達 ${percentText(stationRisks[0]?.shortageRate ?? 0)}。`,
	`車況 API 方面，以定時截取的 15 分鐘車況紀錄估計，在站且非租借車輛中約 ${percentText(data.batteryAvailabilitySummary.unavailable_rate, 2)} 處於不可借狀態；不可借抽樣紀錄中，${percentText(threshold35?.share_of_unavailable ?? 0, 2)} 電量低於 35%，官方 errorMsg 以 ${errorMsgText(errorMessages[0]?.message ?? "NA")} 最常見。`
];

export const motivationParagraphs = [
	"oloo 對清大、交大學生來說是校園移動中不可或缺的一部分。交清校園有明顯坡道，從宿舍、餐廳到教學區，步行經常需要十五到二十分鐘；對於趕時間或是不想走路的學生來說，借不到車會造成很大的不便。",
	"因此，本研究把日常使用經驗轉成三個可量化問題：什麼時段與校區比較容易借不到；哪些站點或路線節點最需要注意；以及借不到車的原因到底是什麼？為什麼常常看到明明有車但是不能借？"
];

export const dataParagraphs = [
	"資料由本專案的 Node.js + TypeScript crawler 蒐集。會變動的 oloo API endpoint 每分鐘寫入 PostgreSQL + TimescaleDB；較不會變動的站點、方案、電子圍籬等靜態資料在啟動時抓一次並 upsert。資料蒐集中間有因網路或服務不穩造成的缺漏，因此所有比例都以有效觀測為分母。",
	`本研究以每 15 分鐘彙整一次的站點紀錄作為分析單位，以下簡稱 15 分鐘觀測窗。本次重算涵蓋 ${numberText(data.metadata.station_windows)} 個清大/交大站點 15 分鐘觀測窗、${numberText(data.signalSummary.status_observations)} 筆車況 API 觀測；另抽取 ${numberText(data.batteryAvailabilitySummary.sample_windows)} 個跨全期間、每次 15 分鐘的定時車況紀錄，用於估計電量與不可借率。低庫存率定義為可借車數低於 3 台的比例；缺車恢復分析則以 1 分鐘資料區間追蹤。`,
	"車況 API 的 errorMsg 保留官方字串，並在括號補中文說明，例如 illegalMovement（異常移動）、illegalDisassembly（異常拆卸）、throttleAbnormal（油門異常）、communicationError（通訊錯誤）等。Connection: close 比較像 API 傳輸或連線訊息，不適合當作車輛錯誤類型，因此不列入車輛錯誤 Top 類型。"
];

export const methodParagraphs = [
	"本報告先把每個 15 分鐘觀測窗整理成平均總車數、平均可借車數、缺車率與低庫存率，再用圖表比較時間、校區與站點之間的差異。這部分主要是描述統計，目的是先把資料樣貌看清楚。",
	"在統計觀念上，可以把每個 15 分鐘觀測窗是否缺車視為 0/1 隨機變數；缺車率就是這個伯努利變數的樣本平均。清大與交大、星期一與星期五的比較，使用兩樣本比例 z 檢定與 95% 信賴區間，對應課程中的假設檢定與兩樣本決策。",
	"補車/恢復分析先找出站點從非缺車進入缺車的一次缺車事件，再追蹤下一筆可借車數大於 0 的紀錄。若恢復時總車數或可借車數突然增加至少 5 台，歸類為大量回補，意思是可借車數或總車數短時間明顯增加；若總車數幾乎不變但可借車恢復，歸類為疑似換電或狀態修復；總車數小幅增加則歸類為一般歸還。這些分類都是站點層級的間接判斷，不代表本研究能直接證明人工補車、換電或維修。",
	"車況 API 只能說明狀態訊號，不能單獨證明最後借車失敗的原因；因此本報告把站點可借車數當作主要結論來源，把電量與官方 API 回傳的 errorMsg 欄位當作解釋「有車卻不能借」的間接證據。"
];

export const q1Paragraphs = [
	`清大和交大不能混在一起看。每日整體來看，清大最不利時段集中在 ${worstHours("每日整體", "清大").join("、")}；交大最不利時段集中在 ${worstHours("每日整體", "交大").join("、")}。圖中交大夜間總量看似較高，主要是 21:00-05:59 的可借車集中在 ${nightTopNctu.map(row => row.station_name.replace("交大-", "")).join("、")}，三站合計約占夜間可借車 ${percentText(nightTopNctuShare)}。`,
	`若以「怎麼比較借得到」為目標，清大每日較佳時段是 ${bestHours("每日整體", "清大").join("、")}；交大每日較佳時段是 ${bestHours("每日整體", "交大").join("、")}。這些建議只代表校區整體歷史平均；實際出發前仍要看附近站點，因為工程四館、二餐後門、體育館、科學一館等站仍常接近沒車。`
];

export const mondayParagraphs = [
	`星期一清大缺車高峰在 ${worstHours("星期一", "清大").join("、")}，較可嘗試 ${bestHours("星期一", "清大").join("、")}；交大缺車高峰在 ${worstHours("星期一", "交大").join("、")}，較可嘗試 ${bestHours("星期一", "交大").join("、")}。`,
	"星期一的策略是避免清大清晨時段，若能選擇，清大傍晚較有機會；交大中午到下午的校區總量相對穩定，但仍可能集中在少數站點。"
];

export const fridayParagraphs = [
	`星期五交大傍晚風險特別明顯，缺車高峰在 ${worstHours("星期五", "交大").join("、")}；清大則高峰在 ${worstHours("星期五", "清大").join("、")}。`,
	`星期五較可嘗試的時間是：清大 ${bestHours("星期五", "清大").join("、")}；交大 ${bestHours("星期五", "交大").join("、")}。對跨校移動來說，星期五傍晚應保留備案，不要只依賴單一站點。`
];

export const q2Paragraphs = [
	"站點差異比單純時間差異更直接。Top 10 高風險站點的共同特徵是平均可借車數低、低庫存率高；這代表使用者即使看到站點有車，也常只剩極少數可借車。",
	"圖表把缺車拆成兩段：完全沒車，以及現場有車但系統顯示不可借。這份資料中 Top 10 幾乎都是後者占主體，表示問題不只是車流被借走，也可能和電量、故障或系統狀態造成的不可用有關。"
];

export const q3Paragraphs = [
	`在不可借抽樣紀錄中，低電量與官方 errorMsg 會大量重疊。以電量門檻看，低於 35% 的紀錄占不可借抽樣紀錄 ${percentText(threshold35?.share_of_unavailable ?? 0, 2)}；若只看官方 errorMsg，扣除 Connection: close 後，前三個 errorMsg 是 ${errorMessages
		.slice(0, 3)
		.map(row => errorMsgText(row.message))
		.join("、")}。`,
	"因此，「有車卻不能借」不適合寫成單一原因。低電量是相當明顯的訊號之一；官方 API 回傳的 errorMsg 則顯示，可能還包含 illegalMovement（異常移動）、illegalDisassembly（異常拆卸）、throttleAbnormal（油門異常）、communicationError（通訊錯誤）等異常類型。"
];

export const q4Paragraphs = [
	`在電量分析中，本研究把 scooter_info 的可借狀態與 scooter_status 的 power 依同車、同 15 分鐘車況紀錄對齊，分母改為在清交站點內且非租借中的車輛紀錄。整體估計不可借率為 ${percentText(data.batteryAvailabilitySummary.unavailable_rate, 2)}。`,
	`結果顯示「35% 附近」可能是重要門檻：低於 30% 的紀錄不可借率為 ${percentText(threshold30?.unavailable_rate_under_threshold ?? 0, 2)}；低於 35% 的紀錄不可借率為 ${percentText(threshold35?.unavailable_rate_under_threshold ?? 0, 2)}，且占所有不可借抽樣紀錄 ${percentText(threshold35?.share_of_unavailable ?? 0, 2)}。`
];

export const q5Paragraphs = [
	`缺車事件共 ${numberText(recoveryTypes.reduce((sum, row) => sum + row.episodes, 0))} 次；其中 ${recoveryTypes[0]?.type ?? "NA"} 占 ${percentText(recoveryTypes[0]?.share ?? 0)}，大量回補只占 ${percentText(recoveryTypes.find(row => row.type === "大量回補")?.share ?? 0)}。`,
	"這表示站點從沒車恢復時，絕大多數不是一次大量補回，而是總車數不變但可借車恢復，或是小量一般歸還。前者可能是換電、維修或系統狀態恢復，但本研究只能把它視為間接判斷指標，不能直接等同人工換電。"
];

export const limitationParagraphs = [
	"限制一：本研究是期末報告，能重跑與人工檢查的時間有限，因此只能取得 2026-05-09 至 2026-06-17 左右的有限週期資訊。資料期間卡到學期末與一小段暑假，通勤型態可能已開始變化，不能直接代表整個學期。",
	`限制二：電量不可借率使用每 ${numberText(data.batteryAvailabilitySummary.sample_every_hours, 0)} 小時取 ${numberText(data.batteryAvailabilitySummary.sample_minutes, 0)} 分鐘的系統性抽樣紀錄，共 ${numberText(data.batteryAvailabilitySummary.sample_windows)} 個抽樣區間。這比原本只看風險訊號更接近不可借率，但仍不是逐分鐘全量 join。`,
	"限制三：補車分析目前用站點總車數與可借車數變化作為間接判斷指標，能區分大量回補、一般歸還與疑似換電或狀態修復，但不能逐台證明是人工換電或系統修復。若要完全分清楚，需要對每一次缺車事件追同車 imei 的 power 與狀態；全期間逐 imei join 在本機硬體上會跑到數小時，超出期末報告可接受成本。"
];

export const conclusionParagraphs = [
	`車為什麼借不到？從站點層級看，Top 10 高風險站點多半不是完全沒車，而是現場有車但系統顯示不可借。電量抽樣紀錄顯示，低於 35% 的車在本次資料中落在高風險區：低於 35% 的紀錄不可借率為 ${percentText(threshold35?.unavailable_rate_under_threshold ?? 0, 2)}，占全部不可借抽樣紀錄 ${percentText(threshold35?.share_of_unavailable ?? 0, 2)}。`,
	`若只看官方 API 回傳的 errorMsg 欄位，最大宗是 ${errorMsgText(errorMessages[0]?.message ?? "NA")}，占不可借抽樣紀錄 ${percentText(errorMessages[0]?.share ?? 0, 2)}；後面依序是 ${errorMsgText(errorMessages[1]?.message ?? "NA")} ${percentText(errorMessages[1]?.share ?? 0, 2)}、${errorMsgText(errorMessages[2]?.message ?? "NA")} ${percentText(errorMessages[2]?.share ?? 0, 2)}。低電量與 errorMsg 會重疊，因此不能把比例直接相加。`,
	"換句話說，借不到不只是單純「沒車」，也不一定是單一故障造成；它很可能是站點庫存少、電量偏低與官方異常狀態一起出現。使用者最實用的做法，是避開缺車高峰，並且不要只看校區總量，要看附近站點是否真的有可借車。",
	`怎麼比較借得到？星期一清大清晨 ${worstHours("星期一", "清大").slice(0, 2).join("、")} 最不利，上學前容易遇到缺車；若行程可調，清大 ${bestHours("星期一", "清大").slice(0, 2).join("、")} 後相對穩定。交大星期一中午到下午整體車量較穩，但仍要看附近站點，不能只看校區總量。`,
	`星期五對交大學生最需要提早出發。資料中星期五交大 ${worstHours("星期五", "交大").slice(0, 2).join("、")} 風險最高，其中 17:00 平均可借約 ${numberText(numberValue(rowFor("星期五", "交大", 17)?.available_avg), 2)} 台、缺車率約 ${percentText(numberValue(rowFor("星期五", "交大", 17)?.shortage_rate))}；若要跨校或下坡移動，最好在 15:00 前完成，至少不要把出發時間拖到 16:00-17:00。`
];

export const indicatorTable: TableData = {
	caption: "指標定義",
	columns: ["指標", "定義", "用途"],
	rows: [
		["缺車率", "可借車數等於 0 的 15 分鐘統計單位比例。", "衡量使用者到站後完全借不到的機率。"],
		["低庫存率", "可借車數低於 3 台的比例。", "衡量接近沒車、選擇很少的狀態。"],
		["有車卻不能借", "總車數大於 0，但可借車數等於 0。", "區分車流不足與車況/系統不可用。"],
		["可能影響可借狀態的車況訊號", "低電量、errorMsg、faultStatus 或 GPS 異常。", "輔助解釋有車卻不能借。"],
		["大量回補", "缺車恢復時，可借車達 5 台以上，或可借/總車數增加至少 5 台。", "估計可借車數或總車數短時間明顯增加。"],
		["疑似換電或狀態修復", "缺車恢復時總車數幾乎不變，但可借車數恢復。", "作為換電、維修或系統狀態恢復的間接證據。"]
	]
};

export const testParagraphs = [
	"為了符合課程中的假設檢定要求，本報告把缺車與低庫存都視為 0/1 事件，針對校區差異與星期差異做兩樣本比例 z 檢定。由於資料量很大，p-value 幾乎都很小，因此解讀重點放在比例差與 95% 信賴區間是否具有實務意義。",
	`結果顯示清大整體缺車率比交大高 ${numberText(Math.abs(data.statisticalTests[0]?.difference_percentage_points ?? 0), 2)} 個百分點；交大星期五缺車率則比星期一高 ${numberText(Math.abs(data.statisticalTests.find(row => row.name === "交大星期一與星期五缺車率比較")?.difference_percentage_points ?? 0), 2)} 個百分點，這和星期五交大要提前借車的策略方向一致。`
];

export const statisticalTestTable: TableData = {
	caption: "兩樣本比例 z 檢定摘要",
	columns: ["檢定", "A", "B", "A-B", "95% CI", "p-value"],
	rows: data.statisticalTests.map(row => [
		row.name,
		`${row.group_a} ${percentText(row.rate_a, 2)}`,
		`${row.group_b} ${percentText(row.rate_b, 2)}`,
		`${row.difference_percentage_points.toFixed(2)} pp`,
		`${row.ci_low.toFixed(2)}-${row.ci_high.toFixed(2)} pp`,
		pValueText(row.p_value)
	])
};

export const strategyTable = (scope: StrategyScope): TableData => ({
	caption: `${scope}每小時策略摘要`,
	columns: ["時間", "清大總數", "清大可借", "清大缺車率", "交大總數", "交大可借", "交大缺車率"],
	rows: strategySeries[scope].map(row => [
		row.hour,
		numberText(row.nthuTotal, 2),
		numberText(row.nthuAvailable, 2),
		percentText(row.nthuShortageRate),
		numberText(row.nctuTotal, 2),
		numberText(row.nctuAvailable, 2),
		percentText(row.nctuShortageRate)
	])
});

export const campusTable: TableData = {
	caption: "清大與交大整體比較",
	columns: ["校區", "平均缺車率", "平均低庫存率", "平均總車數", "平均可借車數"],
	rows: campusMetrics.map(row => [row.campus, percentText(row.shortageRate), percentText(row.lowStockRate), numberText(row.totalAverage, 2), numberText(row.availableAverage, 2)])
};

export const stationRiskTable: TableData = {
	caption: "缺車率最高站點 Top 10",
	columns: ["站點", "校區", "15 分鐘單位", "缺車率", "完全沒車", "有車卻不能借", "低庫存率", "平均可借"],
	rows: stationRisks.map(row => [
		row.station,
		row.campus,
		row.windows,
		percentText(row.shortageRate),
		percentText(row.emptyStationRate),
		percentText(row.unavailableWithVehicleRate),
		percentText(row.lowStockRate),
		numberText(row.availableAverage, 2)
	])
};

export const reasonTable: TableData = {
	caption: "不可借抽樣紀錄中的重疊訊號",
	columns: ["原因/訊號", "觀測數", "占不可借抽樣紀錄比例"],
	rows: reasonSignals.map(row => [row.reason, numberText(row.observations), percentText(row.share, 2)])
};

export const errorMessageTable: TableData = {
	caption: "不可借抽樣紀錄中的官方 errorMsg Top 10（已排除 Connection: close）",
	columns: ["errorMsg", "觀測數", "占不可借抽樣紀錄"],
	rows: errorMessages.map(row => [row.message, numberText(row.observations), percentText(row.share, 2)])
};

export const batteryTable: TableData = {
	caption: "每 10% 電量區間的不可借率估計",
	columns: ["電量", "抽樣紀錄", "不可借", "不可借率", "95% CI"],
	rows: batteryBands.map(row => [row.band, numberText(row.total), numberText(row.unavailable), percentText(row.unavailableRate, 2), `${percentText(row.ciLow, 2)}-${percentText(row.ciHigh, 2)}`])
};

export const recoveryTable: TableData = {
	caption: "缺車後恢復類型",
	columns: ["恢復類型", "事件數", "占比", "已恢復", "中位數", "平均"],
	rows: recoveryTypes.map(row => [row.type, numberText(row.episodes), percentText(row.share), numberText(row.recovered), row.medianMinutes, row.averageMinutes])
};

export const rebalanceTable: TableData = {
	caption: "疑似大量回補站點",
	columns: ["站點", "校區", "事件數", "占比"],
	rows: rebalanceEvents.map(row => [row.station, row.campus, numberText(row.events), percentText(row.share)])
};
