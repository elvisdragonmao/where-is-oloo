import "./styles.css";

import { mountCharts, type ChartId } from "./charts";
import {
	batteryBands,
	campusComparison,
	conclusionParagraphs,
	dataParagraphs,
	errorMessages,
	fridayParagraph,
	fridayStrategy,
	highRiskHours,
	hypothesisTable,
	indicatorTable,
	introParagraphs,
	limitationParagraphs,
	methodParagraphs,
	motivationParagraphs,
	q1Paragraphs,
	q2Paragraphs,
	q3Paragraphs,
	q4Paragraphs,
	q5Paragraphs,
	rebalanceEvents,
	recoveryTypes,
	reportMeta,
	sensitivityTable,
	stationRisks,
	testResultTable,
	unavailableStations,
	vehicleSignals,
	type TableData
} from "./data";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
	throw new Error("Missing #app root");
}

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const fixed = (value: number, digits = 2) => value.toFixed(digits);

const paragraphs = (items: string[]) => items.map(item => `<p>${escapeHtml(item)}</p>`).join("");

const chartFigure = (id: ChartId, title: string, note: string) => `
	<figure class="figure">
		<figcaption>
			<strong>${escapeHtml(title)}</strong>
			<span>${escapeHtml(note)}</span>
		</figcaption>
		<div class="chart-canvas" data-chart="${id}"></div>
	</figure>
`;

const table = (data: TableData) => `
	<div class="table-wrap">
		<table>
			<caption>${escapeHtml(data.caption)}</caption>
			<thead>
				<tr>${data.columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
			</thead>
			<tbody>
				${data.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
			</tbody>
		</table>
	</div>
`;

const page = (id: string, title: string, body: string, variant = "") => `
	<section id="${id}" class="page ${variant}">
		<header class="page-header">
			<span>where-is-oloo</span>
			<span>${escapeHtml(reportMeta.dateRange)}</span>
		</header>
		<h2>${escapeHtml(title)}</h2>
		<div class="page-content">
			${body}
		</div>
		<footer class="page-footer">
			<span>${escapeHtml(reportMeta.title)}</span>
			<span>${escapeHtml(reportMeta.campuses)}</span>
		</footer>
	</section>
`;

const subheading = (title: string) => `<h3>${escapeHtml(title)}</h3>`;

const contents = () => `
	<nav class="toc" aria-label="目錄">
		<h3>目錄</h3>
		<ol>
			<li><span>摘要與研究問題</span><span>01</span></li>
			<li><span>資料蒐集、指標定義與統計方法</span><span>02</span></li>
			<li><span>Q1 高風險時段與星期五借車策略</span><span>04</span></li>
			<li><span>Q2 站點缺車與校區差異</span><span>06</span></li>
			<li><span>Q3 車況訊號與錯誤訊息</span><span>07</span></li>
			<li><span>Q4 電量與妥善率</span><span>09</span></li>
			<li><span>Q5 不可用狀態聚集</span><span>10</span></li>
			<li><span>敏感度分析、限制與結論</span><span>12</span></li>
		</ol>
	</nav>
`;

const highRiskTable = (): TableData => ({
	caption: "高風險小時摘要",
	columns: ["高風險小時", "缺車率", "平滑後缺車率", "低庫存率", "平均可用率"],
	rows: highRiskHours.map(item => [item.hour, percent(item.shortageRate), percent(item.smoothedShortageRate), percent(item.lowStockRate), percent(item.availabilityRate)])
});

const fridayTable = (): TableData => ({
	caption: "星期五借車策略",
	columns: ["小時", "排名", "平均可用車數", "平均可用率", "缺車率", "低庫存率", "建議分數"],
	rows: fridayStrategy.map(item => [
		item.hour,
		String(item.rank),
		fixed(item.availableAverage),
		percent(item.availabilityRate),
		percent(item.shortageRate),
		percent(item.lowStockRate),
		fixed(item.score, 3)
	])
});

const campusTable = (): TableData => ({
	caption: "清大與交大校區比較",
	columns: ["校區", "站點數", "觀測窗", "缺車率", "低庫存率", "平均可借車數", "平均可用率"],
	rows: campusComparison.map(item => [
		item.campus,
		String(item.stations),
		item.windows,
		percent(item.shortageRate),
		percent(item.lowStockRate),
		fixed(item.availableAverage),
		percent(item.availabilityRate)
	])
});

const stationRiskTable = (): TableData => ({
	caption: "高缺車風險站點",
	columns: ["站點", "觀測窗", "缺車率", "完全沒車", "有車但不可借", "低庫存率", "平均可用車數", "高風險時段缺車率"],
	rows: stationRisks.map(item => [
		item.station,
		item.windows,
		percent(item.shortageRate),
		percent(item.emptyStationRate),
		percent(item.unavailableWithVehicleRate),
		percent(item.lowStockRate),
		fixed(item.availableAverage),
		percent(item.highRiskShortageRate)
	])
});

const vehicleSignalTable = (): TableData => ({
	caption: "車況訊號出現比例",
	columns: ["訊號", "訊號出現觀測數", "總車輛觀測數", "出現比例", "診斷分類"],
	rows: vehicleSignals.map(item => [item.signal, item.observations, item.total, percent(item.prevalence, 2), item.diagnosis])
});

const errorMessageTable = (): TableData => ({
	caption: "errorMsg 類型",
	columns: ["errorMsg", "觀測數", "占全部車輛觀測比例"],
	rows: errorMessages.map(item => [item.message, item.observations, percent(item.rate, 2)])
});

const batteryTable = (): TableData => ({
	caption: "電量與不可借比例",
	columns: ["電量組", "總觀測", "不可借觀測", "不可借比例", "租借中觀測"],
	rows: batteryBands.map(item => [item.band, item.total, item.unavailable, percent(item.unavailableRate, 2), item.rented])
});

const rebalanceTable = (): TableData => ({
	caption: "疑似大量回補事件站點分布",
	columns: ["站點", "疑似大量回補事件", "占全部事件比例"],
	rows: rebalanceEvents.map(item => [item.station, String(item.events), percent(item.share)])
});

const recoveryTable = (): TableData => ({
	caption: "缺車後恢復類型",
	columns: ["恢復類型", "episode 數", "占比", "已恢復 episode", "恢復時間中位數", "平均恢復時間"],
	rows: recoveryTypes.map(item => [item.type, item.episodes.toLocaleString("zh-TW"), percent(item.share), item.recovered.toLocaleString("zh-TW"), item.medianMinutes, item.averageMinutes])
});

const unavailableStationTable = (): TableData => ({
	caption: "不可借比例偏高的站點",
	columns: ["站點", "觀測", "不可借比例", "低電量且不可借", "GPS 異常", "平均電量"],
	rows: unavailableStations.map(item => [
		item.station,
		item.observations,
		percent(item.unavailableRate),
		percent(item.lowBatteryUnavailableRate),
		percent(item.gpsAbnormalRate),
		percent(item.averageBattery)
	])
});

app.innerHTML = `
	<div class="print-toolbar" aria-label="報告操作">
		<button id="print-report" type="button">列印 / 匯出 PDF</button>
	</div>
	<main class="document">
		<section class="page page--cover" id="cover">
			<div class="cover-kicker">統計學期末報告</div>
			<h1>${escapeHtml(reportMeta.title)}</h1>
			<p>${escapeHtml(reportMeta.subtitle)}：${escapeHtml(reportMeta.members)}</p>
			<dl class="meta-list">
				<div><dt>資料區間</dt><dd>${escapeHtml(reportMeta.dateRange)}</dd></div>
				<div><dt>校區</dt><dd>${escapeHtml(reportMeta.campuses)}</dd></div>
				<div><dt>觀測單位</dt><dd>${escapeHtml(reportMeta.window)}</dd></div>
			</dl>
			<footer class="cover-footer">where-is-oloo</footer>
		</section>
		${page("summary", "摘要與研究問題", `${paragraphs(introParagraphs)}${paragraphs(motivationParagraphs)}${contents()}`)}
		${page("data", "資料蒐集與整理", paragraphs(dataParagraphs))}
		${page("indicators", "指標定義", table(indicatorTable), "page--dense")}
		${page("method", "統計方法與主要結果", `${paragraphs(methodParagraphs)}${table(testResultTable)}`, "page--dense")}
		${page("hypothesis", "檢定設計", table(hypothesisTable), "page--dense")}
		${page(
			"q1-high-risk",
			"Q1：高風險時段",
			`${paragraphs(q1Paragraphs)}
			${chartFigure("high-risk-hours", "高風險小時的缺車率、低庫存率與平均可用率", "平日 12:00-17:59 是資料偵測出的高風險時段。")}
			${table(highRiskTable())}`
		)}
		${page(
			"q1-friday-chart",
			"Q1：星期五借車策略",
			`<p>${escapeHtml(fridayParagraph)}</p>
			${chartFigure("friday-strategy", "星期五各小時平均可用車數與風險", "凌晨 04:00-06:00 風險最低，午後到傍晚缺車率升高。")}`
		)}
		${page("q1-friday-table", "星期五借車策略完整表", table(fridayTable()), "page--dense")}
		${page(
			"q2-campus",
			"Q2：校區與站點差異",
			`${paragraphs(q2Paragraphs)}
			${chartFigure("campus-comparison", "清大與交大校區比較", "清大缺車率與低庫存率都高於交大。")}
			${table(campusTable())}`
		)}
		${page(
			"q2-stations",
			"Q2：高缺車風險站點",
			`${chartFigure("station-risk", "高缺車風險站點排序", "餐廳、宿舍、教學區邊界與跨校移動節點集中在前段。")}
			${table(stationRiskTable())}`,
			"page--dense"
		)}
		${page(
			"q3-signals",
			"Q3：車況訊號",
			`${paragraphs(q3Paragraphs)}
			${chartFigure("vehicle-signals", "車況訊號盛行率", "警告、錯誤與鎖定訊號高度飽和；故障與 GPS 異常較有辨識力。")}
			${table(vehicleSignalTable())}`
		)}
		${page(
			"q3-errors",
			"Q3：errorMsg 類型",
			`${chartFigure("error-messages", "errorMsg 前十類型", "illegalMovement 是資料中最常見的 errorMsg。")}
			${table(errorMessageTable())}`,
			"page--dense"
		)}
		${page(
			"q4-battery",
			"Q4：電量與妥善率",
			`${paragraphs(q4Paragraphs)}
			${chartFigure("battery-bands", "每 10% 電量區間的不可借比例", "低於 30% 的車輛幾乎都被系統判定不可借。")}
			${table(batteryTable())}`
		)}
		${page(
			"q5-rebalance",
			"Q5：站點與時段聚集",
			`${paragraphs(q5Paragraphs)}
			${chartFigure("rebalance-events", "疑似大量回補事件站點分布", "前五個站點合計占全部疑似大量回補事件的 92.3%。")}
			${table(rebalanceTable())}`
		)}
		${page(
			"q5-recovery",
			"Q5：缺車後是否恢復",
			`<p>${escapeHtml("每次站點從非缺車進入缺車狀態後，追蹤到下一個可借車數大於 0 的觀測窗。若恢復時車數比缺車開始時多至少 5 台，歸類為疑似大量回補；否則歸類為一般歸還或零散恢復。")}</p>
			${chartFigure("recovery-types", "缺車後恢復類型", "多數 episode 屬於一般歸還或零散恢復。")}
			${table(recoveryTable())}`
		)}
		${page(
			"q5-unavailable",
			"Q5：不可借比例偏高站點",
			`${subheading("路線後不可借狀態")}
			<p>${escapeHtml("由於有效站點轉換路線不足，本研究不列路線後不可借比例表。因此，本報告不能直接回答「哪一條路線騎完後更容易壞或不可借」；這部分需要更完整的租借紀錄或路徑資料才能驗證。")}</p>
			${chartFigure("unavailable-stations", "不可借比例偏高站點的車況訊號比較", "高不可借比例站點通常同時有低電量不可借訊號。")}
			${table(unavailableStationTable())}`,
			"page--dense"
		)}
		${page("limits", "敏感度分析、限制與結論", `${paragraphs(limitationParagraphs)}${table(sensitivityTable)}${paragraphs(conclusionParagraphs)}`, "page--dense")}
	</main>
`;

mountCharts();

document.querySelector<HTMLButtonElement>("#print-report")?.addEventListener("click", () => {
	window.print();
});
