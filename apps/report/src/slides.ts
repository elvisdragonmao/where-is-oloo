import "./slides.css";

import { mountCharts, type ChartId } from "./charts";
import { batteryBands, campusMetrics, errorMessages, recoveryTypes, reportMeta, strategySeries } from "./data";

const root = document.querySelector<HTMLDivElement>("#slides");

if (!root) {
	throw new Error("Missing #slides root");
}

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const number = (value: number, digits = 0) => value.toLocaleString("zh-TW", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const nthu = campusMetrics.find(row => row.campus === "清大");
const nctu = campusMetrics.find(row => row.campus === "交大");
const fridayNctu17 = strategySeries["星期五"].find(row => row.hour === "17:00");
const batteryUnder35 = batteryBands.filter(row => ["0-9%", "10-19%", "20-29%", "30-39%"].includes(row.band));
const lowBatteryCritical =
	batteryUnder35.reduce((sum, row) => sum + row.unavailable, 0) /
	Math.max(
		batteryUnder35.reduce((sum, row) => sum + row.total, 0),
		1
	);
const repairProxy = recoveryTypes.find(row => row.type === "疑似換電或狀態修復");
const rebalance = recoveryTypes.find(row => row.type === "大量回補");

const chart = (id: ChartId) => `<div class="slide-chart" data-chart="${id}"></div>`;
const bullets = (items: string[]) => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
const metric = (label: string, value: string) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
const titleMarkup = (title: string, variant: string) => {
	if (variant.includes("slide--cover") && title === "清交校園 oloo 共享滑板車可用性分析") {
		return ["清交校園 oloo 共享滑板車", "可用性分析"].map(line => `<span>${escapeHtml(line)}</span>`).join("");
	}

	return escapeHtml(title);
};

const slide = (eyebrow: string, title: string, body: string, variant = "") => `
	<section class="slide ${variant}">
		<div class="slide-photo-mark" aria-hidden="true"></div>
		<header>
			<span>${escapeHtml(eyebrow)}</span>
			<small>${escapeHtml(reportMeta.subtitle)}</small>
		</header>
		<h1>${titleMarkup(title, variant)}</h1>
		<div class="slide-body">${body}</div>
	</section>
`;

root.innerHTML = `
	<div class="deck-toolbar">
		<button type="button" id="print-slides">匯出 PDF</button>
	</div>
	<main class="deck">
		${slide(
			"01 / 研究問題",
			"清交校園 oloo 共享滑板車可用性分析",
			`<p class="lead">回答兩件事：為什麼借不到車，以及怎麼比較借得到車。</p>
			<div class="meta">${reportMeta.members.map(member => `<span>${escapeHtml(member)}</span>`).join("")}</div>`,
			"slide--cover"
		)}
		${slide(
			"02 / Data",
			"資料蒐集與研究範圍",
			`<div class="metric-grid">
				${metric("資料區間", reportMeta.dateRange)}
				${metric("15 分鐘統計單位", "72,512")}
				${metric("研究站點", "清大 / 交大共 26 站")}
				${metric("車況抽樣", "每 6 小時取 15 分鐘")}
			</div>
			${bullets(["Node.js + TypeScript crawler 每分鐘寫入 PostgreSQL + TimescaleDB。", "靜態站點與電子圍籬啟動時 upsert，動態車數與車況持續紀錄。", "中間有網路與服務不穩造成缺漏，比例皆以有效觀測為分母。"])}`
		)}
		${slide(
			"03 / Methods",
			"統計方法如何對應課程",
			`${bullets(["描述統計：平均車數、缺車率、低庫存率、Top 10 排序。", "隨機變數：每個 15 分鐘統計單位是否缺車視為 0/1 事件。", "兩樣本決策：清大 vs 交大、星期一 vs 星期五，用比例 z 檢定與 95% 信賴區間。", "敏感度與限制：電量門檻、補車間接判斷、期末期間外推限制。"])}`
		)}
		${slide(
			"04 / Q1",
			"每日策略：不要只看校區總數",
			`${chart("strategy-daily")}
			<p>虛線是總車數，實線是可借車；交大夜間總量高，但高度集中在少數站點。</p>`
		)}
		${slide(
			"05 / Q1",
			"星期一與星期五策略不同",
			`<div class="two-charts">${chart("strategy-monday")}${chart("strategy-friday")}</div>
			${bullets(["星期一清大清晨風險高，傍晚相對穩定。", `星期五交大 17:00 平均可借約 ${number(fridayNctu17?.nctuAvailable ?? 0, 2)} 台，缺車率約 ${percent(fridayNctu17?.nctuShortageRate ?? 0)}。`, "跨校或下坡移動不要把出發時間拖到 16:00-17:00。"])}`
		)}
		${slide(
			"06 / Q2",
			"高風險不是只因為完全沒車",
			`${chart("station-risk")}
			<p>Top 10 站點多數缺車來自「有車卻不能借」，不是單純車流被借走。</p>`
		)}
		${slide(
			"07 / Q3",
			"不可借原因：電量與 errorMsg 重疊",
			`${chart("reason-signals")}
			${bullets([`不可借抽樣紀錄中，官方 errorMsg 第一名是 ${errorMessages[0]?.message ?? "NA"}。`, "低電量與 errorMsg 不是互斥分類，不能把比例直接相加。", "Connection: close 比較像 API 傳輸或連線訊息，不列入車輛錯誤 Top 類型。"])}`
		)}
		${slide(
			"08 / Q4",
			"35% 附近是明顯風險門檻",
			`${chart("battery-bands")}
			<div class="metric-grid compact">
				${metric("<35% 不可借率", percent(lowBatteryCritical * 100, 1))}
				${metric("低電量區間", "0-29% 幾乎全不可借")}
				${metric("30-39%", `${percent(batteryBands.find(row => row.band === "30-39%")?.unavailableRate ?? 0)} 不可借`)}
			</div>`
		)}
		${slide(
			"09 / Q5",
			"缺車後多半不是大量補車",
			`${chart("recovery-types")}
			${bullets([`疑似換電或狀態修復約 ${percent(repairProxy?.share ?? 0)}。`, `大量回補約 ${percent(rebalance?.share ?? 0)}，比例很小。`, "站點恢復多半是總車數不變但可借狀態回來，或小量歸還；這是間接判斷。"])}`
		)}
		${slide(
			"10 / Tests",
			"檢定結果支持策略差異",
			`<div class="metric-grid">
				${metric("清大缺車率", percent(nthu?.shortageRate ?? 0))}
				${metric("交大缺車率", percent(nctu?.shortageRate ?? 0))}
				${metric("交大星期五", "顯著高於星期一")}
				${metric("主要判讀", "比例差 + 95% CI")}
			</div>
			${bullets(["樣本數很大，p-value 幾乎都顯著。", "實務重點是差異幅度：清大整體缺車較高；交大星期五傍晚特別需要提早。"])}`
		)}
		${slide(
			"11 / Strategy",
			"怎麼比較借得到",
			`${bullets(["先看附近站點，不只看校區總量。", "星期一清大避開清晨，上學前要保留走路或校車備案。", "星期五交大跨校或下坡移動建議 15:00 前完成，避免 16:00-17:00 才找車。", "看到車卻不能借時，優先檢查低電量或官方 errorMsg，而不是單純當成沒有車。"])}`
		)}
		${slide(
			"12 / Conclusion",
			"結論與限制",
			`${bullets(["借不到不只是單純缺車，還可能和低庫存、低電量與異常狀態同時有關。", "官方 errorMsg 最大宗是 illegalMovement；電量 <35% 也覆蓋多數不可借抽樣紀錄。", "資料期間跨學期末與暑假初期，且電量分析採系統性抽樣估計。", "後續若有更多時間，應補逐 imei 全量 join 與實際借車成功/失敗紀錄。"])}`
		)}
	</main>
`;

mountCharts();

document.querySelector<HTMLButtonElement>("#print-slides")?.addEventListener("click", () => {
	window.print();
});
