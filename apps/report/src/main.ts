import "./styles.css";

import { mountCharts, type ChartId } from "./charts";
import {
	batteryTable,
	campusTable,
	conclusionParagraphs,
	dataParagraphs,
	errorMessageTable,
	fridayParagraphs,
	indicatorTable,
	introParagraphs,
	limitationParagraphs,
	methodParagraphs,
	mondayParagraphs,
	motivationParagraphs,
	q1Paragraphs,
	q2Paragraphs,
	q3Paragraphs,
	q4Paragraphs,
	q5Paragraphs,
	reasonTable,
	rebalanceTable,
	recoveryTable,
	reportMeta,
	stationRiskTable,
	strategyTable,
	type TableData
} from "./data";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
	throw new Error("Missing #app root");
}

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const paragraphs = (items: string[]) => items.map(item => `<p>${escapeHtml(item)}</p>`).join("");
const subheading = (title: string) => `<h3>${escapeHtml(title)}</h3>`;
const coverTitleLines = reportMeta.title === "清交校園 oloo 共享滑板車可用性分析" ? ["清交校園 oloo 共享滑板車", "可用性分析"] : [reportMeta.title];
const coverTitle = coverTitleLines.map(line => `<span>${escapeHtml(line)}</span>`).join("");
const coverAuthors = reportMeta.members
	.reduce<string[][]>((rows, member, index) => {
		if (index % 2 === 0) rows.push([]);
		rows.at(-1)?.push(member);
		return rows;
	}, [])
	.map(row => `<span>${row.map(member => escapeHtml(member)).join("、")}</span>`)
	.join("");
const strategyChartNote = "清大紫、交大藍；虛線為總數，實線為可借。";

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

let pageNo = 0;

const page = (id: string, title: string, body: string, variant = "") => {
	pageNo += 1;
	return `
		<section id="${id}" class="page ${variant}">
			<h2>${escapeHtml(title)}</h2>
			<div class="page-content">${body}</div>
			<footer class="page-footer">第 ${pageNo} 頁</footer>
		</section>
	`;
};

const contents = () => `
	<nav class="toc" aria-label="目錄">
		<h3>目錄</h3>
		<ol>
			<li><span>摘要與研究問題</span><span>1</span></li>
			<li><span>資料蒐集、指標與方法</span><span>2</span></li>
			<li><span>每日與星期策略</span><span>3</span></li>
			<li><span>校區與站點缺車拆解</span><span>6</span></li>
			<li><span>車況原因與電量</span><span>8</span></li>
			<li><span>缺車恢復、限制與結論</span><span>11</span></li>
		</ol>
	</nav>
`;

app.innerHTML = `
	<div class="print-toolbar" aria-label="報告操作">
		<button id="print-report" type="button">列印 / 匯出 PDF</button>
	</div>
	<main class="document">
		<section class="page page--cover" id="cover">
			<div class="cover-kicker">${escapeHtml(reportMeta.subtitle)}</div>
			<h1>${coverTitle}</h1>
			<p class="cover-authors">${coverAuthors}</p>
			<dl class="meta-list">
				<div><dt>資料區間</dt><dd>${escapeHtml(reportMeta.dateRange)}</dd></div>
				<div><dt>研究範圍</dt><dd>${escapeHtml(reportMeta.campuses)}</dd></div>
				<div><dt>觀測單位</dt><dd>${escapeHtml(reportMeta.window)}</dd></div>
			</dl>
			<footer class="cover-footer">統計學期末報告</footer>
		</section>
		${page("summary", "摘要與研究問題", `${paragraphs(introParagraphs)}${paragraphs(motivationParagraphs)}${contents()}`)}
		${page("data", "資料蒐集、指標定義與分析方法", `${paragraphs(dataParagraphs)}${table(indicatorTable)}${subheading("分析方法")}${paragraphs(methodParagraphs)}`, "page--dense")}
		${page(
			"strategy-daily",
			"Q1：每日借車策略",
			`${paragraphs(q1Paragraphs)}
			${chartFigure("strategy-daily", "每日每小時平均總車數與可借車數", strategyChartNote)}
			${table(strategyTable("每日整體"))}`,
			"page--dense"
		)}
		${page(
			"strategy-monday",
			"Q1：星期一借車策略",
			`${paragraphs(mondayParagraphs)}
			${chartFigure("strategy-monday", "星期一每小時平均總車數與可借車數", strategyChartNote)}
			${table(strategyTable("星期一"))}`,
			"page--dense"
		)}
		${page(
			"strategy-friday",
			"Q1：星期五借車策略",
			`${paragraphs(fridayParagraphs)}
			${chartFigure("strategy-friday", "星期五每小時平均總車數與可借車數", strategyChartNote)}
			${table(strategyTable("星期五"))}`,
			"page--dense"
		)}
		${page(
			"campus",
			"Q2：校區差異",
			`${paragraphs(q2Paragraphs)}
			${chartFigure("campus-comparison", "清大與交大整體缺車與低庫存比較", "清大為紫色、交大為藍色；低庫存定義為可借車數低於 3 台。")}
			${table(campusTable)}`
		)}
		${page(
			"stations",
			"Q2：缺車率最高站點",
			`${chartFigure("station-risk", "缺車率 Top 10：完全沒車與有車但不可借", "堆疊段落顯示缺車組成，另列低庫存率作為接近沒車的風險。")}
			${table(stationRiskTable)}`,
			"page--dense"
		)}
		${page(
			"reasons",
			"Q3：有車但不能借的可能原因",
			`${paragraphs(q3Paragraphs)}
			${chartFigure("reason-signals", "低電量與官方 errorMsg 風險訊號", "Connection: close 視為 API 傳輸雜訊，未列入車輛錯誤類型。")}
			${table(reasonTable)}`,
			"page--dense"
		)}
		${page(
			"errors",
			"Q3：官方 errorMsg 類型",
			`${chartFigure("error-messages", "官方 errorMsg Top 10", "errorMsg 保留官方字串，用來描述系統回報的異常類型。")}
			${table(errorMessageTable)}`,
			"page--dense"
		)}
		${page(
			"battery",
			"Q4：電量與車況風險",
			`${paragraphs(q4Paragraphs)}
			${chartFigure("battery-bands", "每 10% 電量區間的車況風險訊號比例", "此圖是風險訊號比例，不是所有車輛中的不可借率；實際電量門檻需另行重算。")}
			${table(batteryTable)}`,
			"page--dense"
		)}
		${page(
			"recovery",
			"Q5：缺車後多久恢復",
			`${paragraphs(q5Paragraphs)}
			${chartFigure("recovery-types", "缺車 episode 的恢復類型", "大多數恢復屬於一般歸還或零散恢復。")}
			${table(recoveryTable)}`,
			"page--dense"
		)}
		${page(
			"rebalance",
			"Q5：疑似大量回補分布",
			`${chartFigure("rebalance-events", "疑似大量回補站點分布", "疑似大量回補只代表一次恢復量較大，不直接等同人工補車。")}
			${table(rebalanceTable)}`,
			"page--dense"
		)}
		${page("limits", "限制與結論", `${paragraphs(limitationParagraphs)}${subheading("結論：為什麼借不到，怎麼借得到")}${paragraphs(conclusionParagraphs)}`, "page--dense")}
	</main>
`;

mountCharts();

document.querySelector<HTMLButtonElement>("#print-report")?.addEventListener("click", () => {
	window.print();
});
