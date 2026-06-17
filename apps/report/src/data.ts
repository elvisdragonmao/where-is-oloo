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
	riskSignal: number;
	errorObservations: number;
	riskSignalRate: number;
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

type GeneratedRecoveryType = {
	recovery_type: string;
	episodes: number;
	share: number;
	recovered_episodes: number;
	median_minutes_to_recovery: number | null;
	average_minutes_to_recovery: number | null;
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
	signalSummary: {
		status_observations: number;
		risk_signal_observations: number;
		low_battery_observations: number;
		error_observations: number;
		fault_observations: number;
		gps_abnormal_observations: number;
	};
	batteryBands: GeneratedBatteryBand[];
	errorMessages: GeneratedErrorMessage[];
	reasonSignals: GeneratedReasonSignal[];
	recoverySummary: GeneratedRecoveryType[];
	rebalanceStations: GeneratedRebalanceStation[];
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

const dateTimeText = (value: string) => value.replace("T", " ").slice(0, 16);

export const reportMeta = {
	title: "清交校園 oloo 共享滑板車可用性分析",
	subtitle: "統計學期末報告",
	members: ["114550020 毛宥鈞", "614002201 蕭爾西", "214952036 曾靖雯", "214952056 吳承諺"],
	dateRange: `${dateTimeText(data.metadata.data_start_at)} 至 ${dateTimeText(data.metadata.data_end_at)}`,
	campuses: "清大、交大",
	window: "站點 15 分鐘觀測窗；缺車恢復 1 分鐘觀測窗；車況 API 以原始狀態觀測彙總",
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

const vehicleErrorMessages = data.errorMessages.filter(row => row.error_msg !== "Connection: close");

export const reasonSignals: ReasonSignal[] = [
	...data.reasonSignals
		.filter(row => row.reason !== "Connection: close")
		.map(row => ({
			reason: row.reason,
			observations: row.observations,
			share: round(row.share_of_signal_observations, 2)
		}))
].slice(0, 10);

export const errorMessages: ErrorMessageCount[] = vehicleErrorMessages.slice(0, 10).map(row => ({
	message: row.error_msg,
	observations: row.observations,
	share: round(row.share_of_all, 2)
}));

export const batteryBands: BatteryBand[] = data.batteryBands
	.slice()
	.sort((a, b) => a.sort_order - b.sort_order)
	.map(row => ({
		band: row.band,
		total: row.total_observations,
		riskSignal: row.risk_signal_observations,
		errorObservations: row.error_observations,
		riskSignalRate: round(row.risk_signal_rate, 2)
	}));

const totalRebalanceEvents = data.rebalanceStations.reduce((sum, row) => sum + row.suspected_rebalance_events, 0);

export const rebalanceEvents: RebalanceEvent[] = data.rebalanceStations.map(row => ({
	station: row.station_name,
	campus: row.campus,
	events: row.suspected_rebalance_events,
	share: round((row.suspected_rebalance_events / Math.max(totalRebalanceEvents, 1)) * 100, 1)
}));

export const recoveryTypes: RecoveryType[] = data.recoverySummary.map(row => ({
	type: row.recovery_type,
	episodes: row.episodes,
	share: round(row.share, 1),
	recovered: row.recovered_episodes,
	medianMinutes: minuteText(row.median_minutes_to_recovery),
	averageMinutes: minuteText(row.average_minutes_to_recovery)
}));

export const introParagraphs = [
	`本報告分析 ${reportMeta.dateRange} 的 oloo 清大、交大站點資料。核心問題不是單純看現場車數，而是學生常遇到的「借不到」：站點完全沒有可借車，或現場有車但系統判定不可借。`,
	`站點層級結果顯示，清大平均缺車率約 ${percentText(campusMetrics.find(row => row.campus === "清大")?.shortageRate ?? 0)}，交大約 ${percentText(campusMetrics.find(row => row.campus === "交大")?.shortageRate ?? 0)}。最高風險站點是 ${stationRisks[0]?.station ?? "NA"}，缺車率達 ${percentText(stationRisks[0]?.shortageRate ?? 0)}。`,
	`車況 API 方面，低電量（<30%）與官方 errorMsg 是最重要的風險訊號。扣除 API 傳輸雜訊「Connection: close」後，最常見的 errorMsg 是 ${errorMsgText(errorMessages[0]?.message ?? "NA")}，占全部車況觀測 ${percentText(errorMessages[0]?.share ?? 0, 2)}。`
];

export const motivationParagraphs = [
	"oloo 對清大、交大學生來說已經是校園移動的一部分。清交校園有明顯坡道，從宿舍、餐廳到教學區，步行經常需要十五到二十分鐘；如果剛好借不到車，通勤時間和體力成本會被放大。",
	"因此，本研究把日常使用經驗轉成三個可量化問題：什麼時段與校區比較容易借不到；哪些站點或路線節點最需要注意；借不到時較可能是沒有車、低電量，還是官方 API 回報的故障或異常狀態。"
];

export const dataParagraphs = [
	"資料由本專案的 Node.js + TypeScript crawler 蒐集。會變動的 oloo API endpoint 每分鐘寫入 PostgreSQL + TimescaleDB；較不會變動的站點、方案、電子圍籬等靜態資料在啟動時抓一次並 upsert。資料蒐集中間有因網路或服務不穩造成的缺漏，因此所有比例都以有效觀測為分母。",
	`本次重算涵蓋 ${numberText(data.metadata.station_windows)} 個清大/交大站點 15 分鐘觀測窗、${numberText(data.signalSummary.status_observations)} 筆車況 API 觀測。站點分析採 15 分鐘窗；低庫存定義為可借車數低於 3 台；缺車恢復分析採 1 分鐘窗。`,
	"車況 API 的 errorMsg 保留官方字串，並在括號補中文說明，例如 illegalMovement（異常移動）、illegalDisassembly（異常拆卸）、throttleAbnormal（油門異常）、communicationError（通訊錯誤）等。Connection: close 在報告圖表中視為 API 傳輸雜訊，不列入車輛錯誤 Top 類型。"
];

export const methodParagraphs = [
	"站點層級以缺車率、低庫存率、平均總車數與平均可借車數描述可用性。缺車率是可借車數等於 0 的觀測窗比例；低庫存率是可借車數低於 3 台的觀測窗比例。",
	"補車/恢復分析先找出站點從非缺車進入缺車的 episode，再追蹤下一筆可借車數大於 0 的觀測。若恢復那筆可借車數達 5 台以上，或相對缺車開始時可借/總車數增加至少 5 台，歸類為疑似大量回補；其餘歸類為一般歸還或零散恢復。",
	"車況 API 只能說明風險訊號，不能單獨證明最終借車失敗原因；因此本報告把站點可借車數當作主要結論來源，把電量與 errorMsg 當作解釋「有車但不能借」的輔助證據。"
];

export const q1Paragraphs = [
	`清大與交大必須分開看。每日整體來看，清大最不利時段集中在 ${worstHours("每日整體", "清大").join("、")}；交大最不利時段集中在 ${worstHours("每日整體", "交大").join("、")}。圖中交大夜間總量看似較高，主要是 21:00-05:59 的可借車集中在十三舍、綜合一館與女二舍，三站約占夜間可借車三分之二。`,
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
	"圖表把缺車拆成兩段：完全沒車，以及有車但不可借。這份資料中 Top 10 幾乎都是「有車但不可借」占主體，表示問題不只是車流被借走，也包含電量、故障或系統狀態造成的不可用。"
];

export const q3Paragraphs = [
	`車況 API 的風險訊號中，低電量（<30%）有 ${numberText(data.signalSummary.low_battery_observations)} 筆；官方 errorMsg 有 ${numberText(data.signalSummary.error_observations)} 筆。扣除 Connection: close 後，前三個 errorMsg 是 ${errorMessages
		.slice(0, 3)
		.map(row => errorMsgText(row.message))
		.join("、")}。`,
	"因此，「有車但不能借」不能只寫成沒電。低電量是明確且大量的訊號；errorMsg 則指出還有 illegalMovement（異常移動）、illegalDisassembly（異常拆卸）、throttleAbnormal（油門異常）、communicationError（通訊錯誤）等故障或異常類型。"
];

export const q4Paragraphs = [
	"電量圖目前呈現的是車況風險訊號比例，不是「所有車輛中不能借的比例」。因此低電量區間接近 100% 只能說明本報告把低電量本身視為風險訊號，不能直接拿來判斷實際 app 從幾 % 以下開始不能借。",
	"若要回答真正的電量門檻，應重新把 scooter_info_observations 的可借狀態與 scooter_status_observations 的 power 依同車、同時間對齊，再計算每個電量區間的不可借率。使用經驗上可能接近 35% 以下，但本版報告未重算前不把 35% 寫成結論。"
];

export const q5Paragraphs = [
	`缺車 episode 共 ${numberText(recoveryTypes.reduce((sum, row) => sum + row.episodes, 0))} 次；其中 ${recoveryTypes[0]?.type ?? "NA"} 占 ${percentText(recoveryTypes[0]?.share ?? 0)}，疑似大量回補只占 ${percentText(recoveryTypes.find(row => row.type === "疑似大量回補")?.share ?? 0)}。`,
	"這表示站點從沒車恢復，絕大多數不是一次大量補回，而是一般歸還或零散恢復。營運端若要改善體感，應把重點放在長期高缺車站點的調度與充電，而不是只看少數大量回補事件。"
];

export const limitationParagraphs = [
	"限制一：本研究是期末報告，能重跑與人工檢查的時間有限，因此只能取得 2026-05-09 至 2026-06-17 左右的有限週期資訊。資料期間卡到學期末與一小段暑假，通勤型態可能已開始變化，不能直接代表整個學期。",
	"限制二：車況 API 與 app 最終借車成功紀錄沒有可靠的一對一對齊，因此車況段落只能稱為風險訊號，不把它寫成完全因果。電量門檻也需要重新以「所有車輛為分母、不可借車為分子」計算，不能用目前的風險訊號圖判定實際門檻。",
	"限制三：補車分析目前只能用站點總車數或可借車數突然增加作為代理指標，還不能分清楚大量回補、多人同時還車、或同一批車被換電池後重新可借。若要分開這三類，需要依候選事件窗口追同車 imei 的 power 與可借狀態；受硬體與資料量限制，全期間 join 可能要跑數小時，超出本次報告可接受成本。"
];

export const conclusionParagraphs = [
	`車為什麼借不到？站點層級看，Top 10 高風險站點多半不是完全沒車，而是有車但不可借。以目前風險訊號口徑，低電量（<30%）有 ${numberText(data.signalSummary.low_battery_observations)} 筆，占風險訊號 ${percentText((data.signalSummary.low_battery_observations / data.signalSummary.risk_signal_observations) * 100, 2)}、占全部車況觀測 ${percentText((data.signalSummary.low_battery_observations / data.signalSummary.status_observations) * 100, 2)}。`,
	`官方 errorMsg 方面，最多的是 ${errorMsgText(errorMessages[0]?.message ?? "NA")}，占全部車況觀測 ${percentText(errorMessages[0]?.share ?? 0, 2)}；後面依序是 ${errorMsgText(errorMessages[1]?.message ?? "NA")}，占 ${percentText(errorMessages[1]?.share ?? 0, 2)}、${errorMsgText(errorMessages[2]?.message ?? "NA")}，占 ${percentText(errorMessages[2]?.share ?? 0, 2)}，以及 ${errorMsgText(errorMessages[3]?.message ?? "NA")}，占 ${percentText(errorMessages[3]?.share ?? 0, 2)}。`,
	"低電量仍然重要，但本版資料只能確認 <30% 被視為風險訊號，不能直接證明實際 app 是 30% 或 35% 以下不能借。要回答「幾 % 以下不能借」，需要重算電量區間不可借率，而不是沿用目前這張風險訊號圖。",
	`怎麼比較借得到？星期一清大清晨 ${worstHours("星期一", "清大").slice(0, 2).join("、")} 最不利，上學前容易遇到缺車；若行程可調，清大 ${bestHours("星期一", "清大").slice(0, 2).join("、")} 後相對穩定。交大星期一中午到下午整體車量較穩，但仍要看附近站點，不能只看校區總量。`,
	`星期五對交大學生最需要提早出發。資料中星期五交大 ${worstHours("星期五", "交大").slice(0, 2).join("、")} 風險最高，其中 17:00 平均可借約 ${numberText(numberValue(rowFor("星期五", "交大", 17)?.available_avg), 2)} 台、缺車率約 ${percentText(numberValue(rowFor("星期五", "交大", 17)?.shortage_rate))}；若要跨校或下坡移動，最好在 15:00 前完成，至少不要把出發時間拖到 16:00-17:00。`
];

export const indicatorTable: TableData = {
	caption: "指標定義",
	columns: ["指標", "定義", "用途"],
	rows: [
		["缺車率", "可借車數等於 0 的 15 分鐘站點觀測窗比例。", "衡量使用者到站後完全借不到的機率。"],
		["低庫存率", "可借車數低於 3 台的 15 分鐘站點觀測窗比例。", "衡量接近沒車、選擇很少的狀態。"],
		["有車但不可借", "總車數大於 0，但可借車數等於 0。", "區分車流不足與車況/系統不可用。"],
		["車況風險訊號", "低電量、errorMsg、faultStatus 或 GPS 異常。", "輔助解釋有車但不能借。"],
		["疑似大量回補", "缺車恢復時，可借車達 5 台以上，或可借/總車數增加至少 5 台。", "估計營運補車或大量回流。"]
	]
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
	columns: ["站點", "校區", "觀測窗", "缺車率", "完全沒車", "有車但不可借", "低庫存率", "平均可借"],
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
	caption: "車況風險訊號與官方 errorMsg",
	columns: ["原因/訊號", "觀測數", "占風險訊號比例"],
	rows: reasonSignals.map(row => [row.reason, numberText(row.observations), percentText(row.share, 2)])
};

export const errorMessageTable: TableData = {
	caption: "官方 errorMsg Top 10（已排除 Connection: close）",
	columns: ["errorMsg", "觀測數", "占全部車況觀測"],
	rows: errorMessages.map(row => [row.message, numberText(row.observations), percentText(row.share, 2)])
};

export const batteryTable: TableData = {
	caption: "每 10% 電量區間的車況風險訊號（非不可借率）",
	columns: ["電量", "車況觀測", "風險訊號", "風險訊號比例", "errorMsg 觀測"],
	rows: batteryBands.map(row => [row.band, numberText(row.total), numberText(row.riskSignal), percentText(row.riskSignalRate, 2), numberText(row.errorObservations)])
};

export const recoveryTable: TableData = {
	caption: "缺車後恢復類型",
	columns: ["恢復類型", "episode", "占比", "已恢復", "中位數", "平均"],
	rows: recoveryTypes.map(row => [row.type, numberText(row.episodes), percentText(row.share), numberText(row.recovered), row.medianMinutes, row.averageMinutes])
};

export const rebalanceTable: TableData = {
	caption: "疑似大量回補站點",
	columns: ["站點", "校區", "事件數", "占比"],
	rows: rebalanceEvents.map(row => [row.station, row.campus, numberText(row.events), percentText(row.share)])
};
