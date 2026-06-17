export type PercentMetric = {
	label: string;
	value: number;
};

export type TableData = {
	caption: string;
	columns: string[];
	rows: string[][];
};

export type HighRiskHour = {
	hour: string;
	shortageRate: number;
	smoothedShortageRate: number;
	lowStockRate: number;
	availabilityRate: number;
};

export type FridayStrategy = {
	hour: string;
	rank: number;
	availableAverage: number;
	availabilityRate: number;
	shortageRate: number;
	lowStockRate: number;
	score: number;
};

export type CampusComparison = {
	campus: string;
	stations: number;
	windows: string;
	shortageRate: number;
	lowStockRate: number;
	availableAverage: number;
	availabilityRate: number;
};

export type StationRisk = {
	station: string;
	windows: string;
	shortageRate: number;
	emptyStationRate: number;
	unavailableWithVehicleRate: number;
	lowStockRate: number;
	availableAverage: number;
	highRiskShortageRate: number;
};

export type VehicleSignal = {
	signal: string;
	observations: string;
	total: string;
	prevalence: number;
	diagnosis: string;
};

export type ErrorMessageCount = {
	message: string;
	observations: string;
	rate: number;
};

export type BatteryBand = {
	band: string;
	total: string;
	unavailable: string;
	unavailableRate: number;
	rented: string;
};

export type RebalanceEvent = {
	station: string;
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

export type UnavailableStation = {
	station: string;
	observations: string;
	unavailableRate: number;
	lowBatteryUnavailableRate: number;
	gpsAbnormalRate: number;
	averageBattery: number;
};

export const reportMeta = {
	title: "清交校園 oloo 共享滑板車可用性與妥善率分析",
	subtitle: "統計學期末報告 第三組",
	members: "114550020 毛宥鈞、614002201 蕭爾西、214952036 曾靖雯、214952056 吳承諺",
	dateRange: "2026-05-09 至 2026-06-16",
	campuses: "清大、交大",
	window: "站點 15 分鐘觀測窗；疑似回補 1 分鐘觀測窗；車輛狀態每小時對齊"
};

export const keyMetrics: PercentMetric[] = [
	{ label: "高風險時段可用率差", value: -6.1 },
	{ label: "最高站點缺車率差", value: 15.94 },
	{ label: "低電量不可借比例差", value: 90.42 },
	{ label: "高風險時段回補事件率倍數", value: 2.46 }
];

export const introParagraphs = [
	"本報告旨在分析清大與交大校園內 oloo 共享滑板車的可用性問題。借不到車通常可分為兩種情況：一種是站點沒有可借車，另一種是現場有車但系統判定不能借。本研究將問題拆分為時間、站點、車況訊號、電量，以及站點或路線聚集現象進行分析。",
	"結論上，資料偵測出的高風險時段確實比較難借，但站點差異更直接。最高缺車站點的缺車率比全站平均高 15.94 個百分點。車輛狀態方面，低於 30% 的車輛幾乎都被系統判定為不可借，和高電量組形成很大的比例差；errorMsg、故障、錯誤訊息與 GPS 訊號則用來補充判讀「有車但不能借」的可能狀態。"
];

export const motivationParagraphs = [
	"oloo 對清大、交大學生來說，已經是校園移動的一部分。清交校園有不少坡道，從宿舍到教學區、從交大到清大，步行經常需要十幾到二十分鐘；短距離移動時若有可借車輛，可以明顯降低移動成本。實際使用時，使用者面對的問題不只是「站點停了幾台車」，而是「是否有車可以借，以及有車時為什麼不能借」。",
	"因此，本研究將使用者經驗轉換為統計問題，避免只依靠主觀印象判斷哪些站點容易缺車。五個主要問題如下：資料顯示的高風險時段是否更難借車；哪些站點最容易缺車或低妥善率；有車但不能借時，狀態訊號如何分布；電量是否能解釋妥善率；不可用狀態是否集中在特定站點、時段或路線。"
];

export const dataParagraphs = [
	"本研究以固定頻率記錄 oloo 站點與車輛狀態，將「借不到車」這種日常經驗轉成可以重複計算的觀測資料。分析資料涵蓋 2026-05-09 到 2026-06-16 的歷史紀錄，並且只保留交大與清大站點，讓後面的缺車率、可借率與電量比較都對應清大與交大的校園使用情境。資料蒐集中間有少數時間因網路或服務不穩而缺漏，因此後續比例都只以有效觀測窗為分母。",
	"整理後的資料分成兩個層次。站點層級用來看每個站點在不同時間的總車數、可借車數、缺車與低庫存狀態，因此可以回答哪些時段更難借、哪些站點風險最高。車輛層級則用來看電量、可借狀態與車況訊號，因此可以回答低電量是否與妥善率下降有關。",
	"對站點車數突然增加的處理採用代理指標：如果同一站點在 1 分鐘觀測窗內車數增加至少 5 台，就標記為一次候選事件；若 30 分鐘內連續出現多次增加，則合併成同一事件。這個定義仍可能混入多人同時還車，不能直接等同人工補車，因此後文只把它當成「疑似大量回補」訊號。"
];

export const methodParagraphs = [
	"本報告先用描述性統計整理站點與車輛狀態，再用兩樣本比例比較、95% 信賴區間與 p-value 檢定時間、站點、電量與事件集中度的差異。顯著水準設定為 0.05。因為同一份報告同時檢定多個研究問題，主要結果另外做多重比較修正，降低多次檢定造成的假陽性風險。",
	"方法安排上，Q1 先由資料找出高風險時段，再比較高風險時段與其他時段的平均可借率，Q2 用缺車率與信賴區間找出站點差異，Q3 以描述統計整理車況訊號，Q4 比較低電量與高電量兩組不可借比例，Q5 只把站點車數突然增加當成疑似大量回補代理指標。每個結果同時看 p-value、95% CI 與效果大小，不只看顯著不顯著。"
];

export const q1Paragraphs = [
	"高風險時段不是先用直覺指定，而是先由資料決定。做法是把平日站點觀測依小時分組，計算每小時缺車率，再用 3 小時移動平均平滑短期波動，最後把平滑後缺車率位於前 25% 的時段定義為高風險時段。依目前資料，偵測出的高風險時段為平日 12:00-17:59。",
	"依上述資料驅動定義回到站點 15 分鐘觀測窗後，高風險時段可用率比其他時段低 6.10 個百分點，95% CI 為 -6.40 到 -5.79 個百分點，p-value < 0.001。若改看缺車率，高風險時段為 22.39%，其他時段為 12.92%，差 9.46 個百分點。"
];

export const fridayParagraph =
	"星期五的借車策略以歷史資料中的平均可借車數、平均可用率、缺車率與低庫存率共同評估。排名 1 代表星期五相對較推薦的出發小時；此排名不是保證借得到車，而是從歷史資料中找出風險相對較低的時段。";

export const q2Paragraphs = [
	"Q2 是整份報告最有實務意義的部分。時間有差，但站點差異更大。以缺車率排序，清大-清華小吃部站的缺車率達 30.9%，是最需要被使用者避開、也最值得營運端優先處理的站點之一。",
	"排名顯示，宿舍、餐廳、教學區邊界與跨校移動節點的缺車或低妥善率風險較高。這也符合共享運具常見的空間不平衡：車輛會被需求方向帶走，後續需要車的使用者不一定剛好位於車輛回流的站點。"
];

export const q3Paragraphs = [
	"資料中有可觀察的車況欄位，也有 errorMsg 這類官方錯誤訊息。本研究保留 errorMsg 原文，因此除了「有沒有錯誤訊息」之外，也把 illegalMovement、communicationError、hallSensorAbnormal、controllerUv、4gModuleNoResponse 等錯誤類型拆開。",
	"本段所稱的車況訊號出現比例，也就是統計上常說的盛行率，計算方式是：某一訊號出現的觀測數除以同期間所有車輛狀態觀測數。它回答的是「這個訊號在資料裡多常出現」，不是「這個訊號有多大機率造成不能借」。",
	"有些警告或鎖定訊號幾乎在所有車輛上都出現，意思是它們沒有足夠辨識力，不適合被寫成「不能借的主要原因」。比較能補充描述的是故障訊號、errorMsg 類型與 GPS 異常；其中 errorMsg 只代表系統回報的錯誤類型，不直接等同因果原因。"
];

export const q4Paragraphs = [
	"電量與不可借狀態的關聯最為明顯。每小時整理車輛電量與可借狀態後，低於 30% 的電量組共有 62,879 筆觀測，其中 62,783 筆被系統判定為不可借，不可借比例 99.85%；60% 以上電量組不可借比例只有 9.43%。兩者比例差為 90.42 個百分點，95% CI：90.14 到 90.71 個百分點，p-value < 0.001。",
	"這支持「低電量與不可借狀態高度相關」。但因為資料沒有直接原因欄位，本報告不寫成「低電量造成不可借」，而是更保守地說：低電量是目前最有解釋力的車況訊號。電量表已改成每 10% 一組，讓臨界區間不會被過粗的分組蓋掉。"
];

export const q5Paragraphs = [
	"Q5 的答案是有站點聚集，但不能把站點車數增加直接解讀成人工補車。第一種聚集是站點狀態聚集：有些站點不可借比例與低電量不可借比例明顯偏高。第二種是站點車數突然增加的代理訊號：當站點車數在 1 分鐘內增加至少 5 台，並把 30 分鐘內相近的增加合併後，總共得到 26 次疑似大量回補事件。",
	"高風險時段的疑似大量回補事件率約為其他時段的 2.46 倍，95% CI：1.10 到 5.53，p-value 0.02877。站點分布方面，前五個站點合計占全部疑似大量回補事件的 92.3%，表示此類事件並非平均分散在所有站點，而是集中在少數需求或回流較明顯的位置。"
];

export const limitationParagraphs = [
	"敏感度分析用來檢查結論是否過度依賴單一門檻。缺車/低庫存門檻改成可用車數小於等於 0、1、2，站點車數增加門檻在 1 分鐘觀測窗內改成至少 3 或 5 台，主要結論仍是：高風險站點存在，且站點車數突然增加有時間聚集。",
	"限制包含：系統快照不等於使用者實際借車成功紀錄；資料蒐集中間有少數網路或服務不穩造成的缺漏；errorMsg 是系統回報狀態而不是人工確認原因；疑似大量回補仍可能混入多人同時還車；路線由車輛站點轉換推估，不等於完整 GPS 路徑；站點重複觀測違反完全獨立假設，因此主文用效果大小與方向搭配檢定結果，不把 p-value 當成唯一答案。"
];

export const conclusionParagraphs = [
	"如果要把這份報告濃縮成一句話：oloo 借不到的問題不是單純「車少」，而是時間、站點、電量與車況共同造成的可用性問題。資料偵測出的高風險時段會讓借車變難，但真正需要優先處理的是高缺車率與高不可借比例的站點；低電量是目前最強的不可借訊號，errorMsg 類型則補充說明有車但不能借時常見的系統狀態。",
	"對使用者來說，這份報告可以轉成借車策略：避開高缺車站點與資料顯示的高風險時段，星期一或星期五出門前優先看清大/交大分開後的平均可借車數。對營運端來說，這份報告指出了優先順序：先處理低電量與高不可借比例站點，再用 errorMsg 類型、缺車後恢復時間與疑似大量回補分布，判斷主要問題較可能來自低電量、故障或調度不足。"
];

export const indicatorTable: TableData = {
	caption: "本報告使用的指標定義",
	columns: ["指標", "計算方式", "統計意義", "閱讀方式"],
	rows: [
		[
			"觀測窗",
			"站點分析以每 15 分鐘為一個觀測窗；疑似大量回補分析以每 1 分鐘為一個觀測窗；車輛狀態分析以每小時對齊一次車輛狀態。",
			"後續比例、平均與事件率的基本分析單位。",
			"觀測窗越多，代表該估計值的分母越大，結果通常越穩定。"
		],
		["可借車數", "在某一站點觀測窗內，系統判定可借的車輛數。", "站點可用性的原始計數，後續的缺車率、低庫存率與平均可用率都由它推得。", "現場有車不一定等於可借。"],
		["缺車率", "可借車數等於 0 的站點觀測窗數，除以全部有效站點觀測窗數。", "二元比例，分子是完全沒有可借車的次數。", "越高代表越常遇到站點沒有任何可借車。"],
		["低庫存率", "可借車數低於 3 台的站點觀測窗數，除以全部有效站點觀測窗數。", "捕捉還沒有完全缺車，但已經接近沒車的狀態。", "越高代表使用者到站後可選擇的車很少。"],
		["平均可用率", "每個站點觀測窗以可借車數除以有效車輛數，再取平均。", "避免只看車數而忽略不同站點規模差異。", "越高代表該時段或站點整體比較容易借到車。"],
		["不可借比例", "同一組車輛觀測中被系統判定為不可借的筆數，除以全部車輛觀測筆數。", "車輛層級二元比例，用來比較電量組或站點車況。", "描述狀態關聯，不直接宣稱不可借原因。"],
		["車況訊號出現比例", "某一車況訊號出現的車輛狀態觀測數，除以同期間所有車輛狀態觀測數。", "描述該訊號在資料中多常被觀察到。", "不等於該訊號造成不可借的機率。"],
		["高風險時段", "先對平日每一小時計算缺車率，再用 3 小時移動平均平滑，最後取前 25% 小時。", "由資料排序借車困難時段。", "不是事先指定的早晚尖峰。"],
		["疑似補車事件", "同一站點在 1 分鐘觀測窗內車數增加至少 5 台；30 分鐘內連續候選事件合併。", "站點事件率分析的代理事件定義。", "可能混入多人同時還車，不能直接視為人工補車。"]
	]
};

export const hypothesisTable: TableData = {
	caption: "研究假設與檢定設計",
	columns: ["題目", "H0", "H1", "檢定方法", "判斷方式"],
	rows: [
		[
			"Q1 高風險時段是否比較難借？",
			"資料偵測高風險時段與其他時段的站點可用率相同。",
			"高風險時段的站點可用率低於其他時段。",
			"先以每小時缺車率偵測高風險時段，再比較兩組站點可用率。",
			"多重比較修正後 p-value < 0.05 且 95% CI 不包含 0 時拒絕 H0。"
		],
		["Q2 哪些站點缺車風險較高？", "不同站點的缺車風險沒有差異。", "至少一個站點的缺車風險高於全站平均。", "描述統計與比例信賴區間。", "多重比較修正後 p-value < 0.05 且 95% CI 不包含 0 時拒絕 H0。"],
		["Q3 車況訊號如何分布？", "各類車況訊號與不可借狀態沒有明顯關聯。", "至少一類車況訊號與不可借狀態有關聯。", "描述統計：整理各類車況訊號的出現比例。", "此題作描述性分析，不用 p-value 硬拒絕 H0。"],
		["Q4 電量是否影響車輛妥善率？", "低電量與高電量車輛的不可借比例相同。", "低電量車輛的不可借比例較高。", "兩樣本比例比較。", "多重比較修正後 p-value < 0.05 且 95% CI 不包含 0 時拒絕 H0。"],
		[
			"Q5 疑似大量回補事件是否集中在高風險時段？",
			"高風險時段與其他時段的疑似大量回補事件率相同。",
			"疑似大量回補事件集中於特定時段。",
			"比較高風險時段與其他時段的 1 分鐘事件率。",
			"多重比較修正後 p-value < 0.05 且 95% CI 不包含 1 時拒絕 H0。"
		]
	]
};

export const testResultTable: TableData = {
	caption: "主要檢定結果",
	columns: ["研究問題", "效果大小", "95% CI", "p-value", "多重比較後 p-value", "統計決策"],
	rows: [
		["Q1 高風險時段是否比較難借？", "高風險時段可用率比其他時段低 6.10 個百分點", "-6.40 到 -5.79 個百分點", "< 0.001", "< 0.001", "拒絕 H0；結果具有統計顯著性，且效果大小具實務意義。"],
		["Q2 哪些站點缺車風險較高？", "最高風險站點缺車率比全站平均高 15.94 個百分點", "13.70 到 18.17 個百分點", "< 0.001", "< 0.001", "拒絕 H0；結果具有統計顯著性，且效果大小具實務意義。"],
		["Q3 車況訊號如何分布？", "最高車況訊號出現比例為 47.5%", "47.28% 到 47.79%", "NA", "NA", "未進行正式拒絕檢定；此結果作為描述性或代理指標證據。"],
		["Q4 電量是否影響車輛妥善率？", "低電量組不可借比例比高電量組高 90.42 個百分點", "90.14 到 90.71 個百分點", "< 0.001", "< 0.001", "拒絕 H0；結果具有統計顯著性，且效果大小具實務意義。"],
		["Q5 疑似大量回補事件是否集中在高風險時段？", "高風險時段事件率為其他時段的 2.46 倍", "1.10 到 5.53 倍", "0.02877", "0.02877", "拒絕 H0；結果具有統計顯著性，且效果大小具實務意義。"]
	]
};

export const highRiskHours: HighRiskHour[] = [
	{ hour: "12:00", shortageRate: 21.0, smoothedShortageRate: 21.5, lowStockRate: 68.8, availabilityRate: 76.3 },
	{ hour: "13:00", shortageRate: 22.6, smoothedShortageRate: 21.8, lowStockRate: 70.9, availabilityRate: 75.4 },
	{ hour: "14:00", shortageRate: 21.7, smoothedShortageRate: 22.8, lowStockRate: 66.9, availabilityRate: 76.0 },
	{ hour: "15:00", shortageRate: 24.0, smoothedShortageRate: 22.5, lowStockRate: 69.8, availabilityRate: 73.2 },
	{ hour: "16:00", shortageRate: 21.8, smoothedShortageRate: 23.0, lowStockRate: 65.9, availabilityRate: 75.8 },
	{ hour: "17:00", shortageRate: 23.2, smoothedShortageRate: 21.9, lowStockRate: 66.3, availabilityRate: 72.5 }
];

export const fridayStrategy: FridayStrategy[] = [
	{ hour: "00:00", rank: 8, availableAverage: 4.28, availabilityRate: 84.0, shortageRate: 14.9, lowStockRate: 64.7, score: 0.803 },
	{ hour: "01:00", rank: 6, availableAverage: 4.52, availabilityRate: 86.9, shortageRate: 9.8, lowStockRate: 61.5, score: 0.935 },
	{ hour: "02:00", rank: 5, availableAverage: 4.67, availabilityRate: 86.9, shortageRate: 12.1, lowStockRate: 64.6, score: 0.936 },
	{ hour: "03:00", rank: 3, availableAverage: 5.29, availabilityRate: 88.3, shortageRate: 10.9, lowStockRate: 57.1, score: 1.066 },
	{ hour: "04:00", rank: 2, availableAverage: 5.59, availabilityRate: 92.1, shortageRate: 6.6, lowStockRate: 51.8, score: 1.203 },
	{ hour: "05:00", rank: 1, availableAverage: 5.58, availabilityRate: 93.7, shortageRate: 5.4, lowStockRate: 53.6, score: 1.216 },
	{ hour: "06:00", rank: 4, availableAverage: 4.79, availabilityRate: 89.6, shortageRate: 15.3, lowStockRate: 62.1, score: 0.962 },
	{ hour: "07:00", rank: 7, availableAverage: 4.42, availabilityRate: 87.0, shortageRate: 12.1, lowStockRate: 65.2, score: 0.875 },
	{ hour: "08:00", rank: 10, availableAverage: 3.33, availabilityRate: 83.1, shortageRate: 22.4, lowStockRate: 73.2, score: 0.479 },
	{ hour: "09:00", rank: 16, availableAverage: 2.98, availabilityRate: 78.0, shortageRate: 27.1, lowStockRate: 66.9, score: 0.341 },
	{ hour: "10:00", rank: 14, availableAverage: 2.97, availabilityRate: 77.2, shortageRate: 23.6, lowStockRate: 68.3, score: 0.355 },
	{ hour: "11:00", rank: 13, availableAverage: 3.14, availabilityRate: 75.2, shortageRate: 25.5, lowStockRate: 65.7, score: 0.37 },
	{ hour: "12:00", rank: 17, availableAverage: 2.64, availabilityRate: 68.2, shortageRate: 20.8, lowStockRate: 80.3, score: 0.192 },
	{ hour: "13:00", rank: 21, availableAverage: 2.28, availabilityRate: 67.7, shortageRate: 29.9, lowStockRate: 88.9, score: 0 },
	{ hour: "14:00", rank: 24, availableAverage: 2.26, availabilityRate: 62.6, shortageRate: 40.7, lowStockRate: 85.6, score: -0.149 },
	{ hour: "15:00", rank: 23, availableAverage: 2.57, availabilityRate: 62.7, shortageRate: 39.5, lowStockRate: 83.9, score: -0.086 },
	{ hour: "16:00", rank: 22, availableAverage: 3.04, availabilityRate: 63.8, shortageRate: 43.4, lowStockRate: 84.7, score: -0.029 },
	{ hour: "17:00", rank: 18, availableAverage: 3.38, availabilityRate: 67.1, shortageRate: 40.0, lowStockRate: 82.2, score: 0.127 },
	{ hour: "18:00", rank: 20, availableAverage: 2.49, availabilityRate: 69.6, shortageRate: 31.7, lowStockRate: 86.7, score: 0.035 },
	{ hour: "19:00", rank: 19, availableAverage: 2.09, availabilityRate: 71.7, shortageRate: 23.5, lowStockRate: 81.5, score: 0.116 },
	{ hour: "20:00", rank: 15, availableAverage: 2.57, availabilityRate: 77.3, shortageRate: 17.3, lowStockRate: 73.0, score: 0.342 },
	{ hour: "21:00", rank: 9, availableAverage: 3.04, availabilityRate: 83.2, shortageRate: 13.8, lowStockRate: 67.5, score: 0.541 },
	{ hour: "22:00", rank: 12, availableAverage: 2.88, availabilityRate: 77.9, shortageRate: 15.2, lowStockRate: 68.0, score: 0.429 },
	{ hour: "23:00", rank: 11, availableAverage: 2.91, availabilityRate: 80.6, shortageRate: 17.9, lowStockRate: 70.0, score: 0.432 }
];

export const campusComparison: CampusComparison[] = [
	{ campus: "交大", stations: 17, windows: "31,955", shortageRate: 12.0, lowStockRate: 53.9, availableAverage: 6.44, availabilityRate: 86.7 },
	{ campus: "清大", stations: 9, windows: "14,279", shortageRate: 21.6, lowStockRate: 74.7, availableAverage: 3.06, availabilityRate: 75.7 }
];

export const stationRisks: StationRisk[] = [
	{ station: "清大-清華小吃部站", windows: "1,676", shortageRate: 30.9, emptyStationRate: 0, unavailableWithVehicleRate: 30.9, lowStockRate: 85.5, availableAverage: 1.56, highRiskShortageRate: 29.9 },
	{ station: "交大-二餐後門站", windows: "1,477", shortageRate: 28.2, emptyStationRate: 0, unavailableWithVehicleRate: 28.2, lowStockRate: 86.7, availableAverage: 1.31, highRiskShortageRate: 41.2 },
	{ station: "清大-綜合三館站", windows: "1,006", shortageRate: 27.9, emptyStationRate: 0, unavailableWithVehicleRate: 27.9, lowStockRate: 82.3, availableAverage: 1.4, highRiskShortageRate: 32.7 },
	{ station: "清大-化學館站", windows: "2,079", shortageRate: 26.8, emptyStationRate: 0, unavailableWithVehicleRate: 26.8, lowStockRate: 81.3, availableAverage: 2.11, highRiskShortageRate: 24.1 },
	{ station: "交大-竹軒站", windows: "1,726", shortageRate: 23.1, emptyStationRate: 0, unavailableWithVehicleRate: 23.1, lowStockRate: 80.1, availableAverage: 1.7, highRiskShortageRate: 40.4 },
	{ station: "清大-仁齋站", windows: "1,775", shortageRate: 23.0, emptyStationRate: 0, unavailableWithVehicleRate: 23.0, lowStockRate: 76.8, availableAverage: 2.04, highRiskShortageRate: 32.0 },
	{ station: "交大-二餐前門站", windows: "1,725", shortageRate: 20.8, emptyStationRate: 0, unavailableWithVehicleRate: 20.8, lowStockRate: 75.1, availableAverage: 2.47, highRiskShortageRate: 42.1 },
	{ station: "清大-駐警隊站", windows: "1,638", shortageRate: 19.8, emptyStationRate: 0, unavailableWithVehicleRate: 19.8, lowStockRate: 74.2, availableAverage: 2.94, highRiskShortageRate: 27.2 },
	{ station: "清大-材料科技館站", windows: "938", shortageRate: 19.1, emptyStationRate: 0, unavailableWithVehicleRate: 19.1, lowStockRate: 86.0, availableAverage: 1.44, highRiskShortageRate: 24.9 },
	{ station: "交大-科學一館站", windows: "750", shortageRate: 18.4, emptyStationRate: 0, unavailableWithVehicleRate: 18.4, lowStockRate: 90.5, availableAverage: 1.33, highRiskShortageRate: 24.0 }
];

export const vehicleSignals: VehicleSignal[] = [
	{ signal: "警告狀態", observations: "149,784", total: "149,784", prevalence: 100.0, diagnosis: "高度飽和，低辨識度" },
	{ signal: "錯誤訊息", observations: "149,058", total: "149,784", prevalence: 99.52, diagnosis: "高度飽和，低辨識度" },
	{ signal: "鎖定狀態", observations: "138,248", total: "149,784", prevalence: 92.3, diagnosis: "高度飽和，低辨識度" },
	{ signal: "故障狀態", observations: "71,196", total: "149,784", prevalence: 47.53, diagnosis: "可比較的狀態訊號" },
	{ signal: "GPS 異常", observations: "5,055", total: "149,784", prevalence: 3.37, diagnosis: "可比較的狀態訊號" },
	{ signal: "充電狀態", observations: "0", total: "149,784", prevalence: 0, diagnosis: "幾乎未出現，低辨識度" }
];

export const errorMessages: ErrorMessageCount[] = [
	{ message: "illegalMovement", observations: "114,499", rate: 76.44 },
	{ message: "Connection: close", observations: "14,816", rate: 9.89 },
	{ message: "throttleAbnormal", observations: "11,658", rate: 7.78 },
	{ message: "illegalDisassembly", observations: "5,365", rate: 3.58 },
	{ message: "hallSensorAbnormal", observations: "1,546", rate: 1.03 },
	{ message: "motorHighTemperature", observations: "845", rate: 0.56 },
	{ message: "communicationError", observations: "222", rate: 0.15 },
	{ message: "dcOcp", observations: "29", rate: 0.02 },
	{ message: "motorLossPhase", observations: "28", rate: 0.02 },
	{ message: "motorPhaseOc", observations: "26", rate: 0.02 }
];

export const batteryBands: BatteryBand[] = [
	{ band: "0-9%", total: "12,146", unavailable: "12,138", unavailableRate: 99.93, rented: "7" },
	{ band: "10-19%", total: "15,383", unavailable: "15,372", unavailableRate: 99.93, rented: "7" },
	{ band: "20-29%", total: "35,350", unavailable: "35,273", unavailableRate: 99.78, rented: "60" },
	{ band: "30-39%", total: "23,771", unavailable: "13,462", unavailableRate: 56.63, rented: "704" },
	{ band: "40-49%", total: "14,055", unavailable: "2,367", unavailableRate: 16.84, rented: "716" },
	{ band: "50-59%", total: "7,934", unavailable: "1,136", unavailableRate: 14.32, rented: "481" },
	{ band: "60-69%", total: "7,503", unavailable: "494", unavailableRate: 6.58, rented: "532" },
	{ band: "70-79%", total: "13,648", unavailable: "805", unavailableRate: 5.9, rented: "714" },
	{ band: "80-89%", total: "11,556", unavailable: "1,796", unavailableRate: 15.54, rented: "522" },
	{ band: "90-100%", total: "8,438", unavailable: "783", unavailableRate: 9.28, rented: "451" }
];

export const rebalanceEvents: RebalanceEvent[] = [
	{ station: "清大-清華小吃部站", events: 9, share: 34.6 },
	{ station: "清大-化學館站", events: 7, share: 26.9 },
	{ station: "清大-工程一館站", events: 5, share: 19.2 },
	{ station: "交大-工程三館站", events: 2, share: 7.7 },
	{ station: "交大-十三舍站", events: 1, share: 3.8 },
	{ station: "交大-活動中心站", events: 1, share: 3.8 },
	{ station: "交大-科學三館站", events: 1, share: 3.8 }
];

export const recoveryTypes: RecoveryType[] = [
	{ type: "一般歸還或零散恢復", episodes: 3549, share: 99.4, recovered: 3549, medianMinutes: "45 分鐘", averageMinutes: "169.9 分鐘" },
	{ type: "觀測窗內未恢復", episodes: 13, share: 0.4, recovered: 0, medianMinutes: "NA", averageMinutes: "NA" },
	{ type: "疑似大量回補", episodes: 8, share: 0.2, recovered: 8, medianMinutes: "38 分鐘", averageMinutes: "330.0 分鐘" }
];

export const unavailableStations: UnavailableStation[] = [
	{ station: "交大-二餐後門站", observations: "2,989", unavailableRate: 80.6, lowBatteryUnavailableRate: 58.5, gpsAbnormalRate: 3.7, averageBattery: 34.4 },
	{ station: "交大-竹軒站", observations: "3,877", unavailableRate: 78.7, lowBatteryUnavailableRate: 64.2, gpsAbnormalRate: 0.1, averageBattery: 29.7 },
	{ station: "清大-化學館站", observations: "7,023", unavailableRate: 78.6, lowBatteryUnavailableRate: 53.5, gpsAbnormalRate: 3.6, averageBattery: 36.0 },
	{ station: "清大-清華小吃部站", observations: "3,863", unavailableRate: 77.8, lowBatteryUnavailableRate: 47.7, gpsAbnormalRate: 16.9, averageBattery: 40.7 },
	{ station: "交大-科學一館站", observations: "1,119", unavailableRate: 76.4, lowBatteryUnavailableRate: 69.0, gpsAbnormalRate: 0.1, averageBattery: 27.8 },
	{ station: "清大-綜合三館站", observations: "1,770", unavailableRate: 76.3, lowBatteryUnavailableRate: 32.7, gpsAbnormalRate: 0.4, averageBattery: 40.6 },
	{ station: "交大-體育館站", observations: "1,720", unavailableRate: 76.2, lowBatteryUnavailableRate: 60.1, gpsAbnormalRate: 3.2, averageBattery: 31.0 },
	{ station: "清大-仁齋站", observations: "3,401", unavailableRate: 70.7, lowBatteryUnavailableRate: 37.3, gpsAbnormalRate: 0.6, averageBattery: 38.7 },
	{ station: "交大-工程四館站", observations: "2,938", unavailableRate: 70.4, lowBatteryUnavailableRate: 61.6, gpsAbnormalRate: 2.7, averageBattery: 31.8 },
	{ station: "清大-材料科技館站", observations: "1,252", unavailableRate: 70.3, lowBatteryUnavailableRate: 60.2, gpsAbnormalRate: 1.3, averageBattery: 33.3 }
];

export const sensitivityTable: TableData = {
	caption: "敏感度分析",
	columns: ["研究問題", "設定", "改變的假設", "估計值"],
	rows: [
		["Q2", "低妥善率門檻_可用車數小於等於_0", "可用車數 <= 0", "0.0439"],
		["Q2", "低妥善率門檻_可用車數小於等於_1", "可用車數 <= 1", "0.3946"],
		["Q2", "低妥善率門檻_可用車數小於等於_2", "可用車數 <= 2", "0.5516"],
		["Q5", "可能補車門檻_車數增加大於等於_3", "站點車數增加 >= 3", "0.0003"],
		["Q5", "可能補車門檻_車數增加大於等於_5", "站點車數增加 >= 5", "0.0000"]
	]
};
