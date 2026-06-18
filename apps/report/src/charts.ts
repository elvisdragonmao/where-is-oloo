import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type { EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";

import { batteryBands, campusMetrics, errorMessages, reasonSignals, rebalanceEvents, recoveryTypes, stationRisks, strategySeries, type StrategyScope } from "./data";

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

export type ChartId =
	| "strategy-daily"
	| "strategy-monday"
	| "strategy-friday"
	| "campus-comparison"
	| "station-risk"
	| "reason-signals"
	| "error-messages"
	| "battery-bands"
	| "recovery-types"
	| "rebalance-events";

const colors = {
	ink: "#111111",
	line: "#d0d0d0",
	nthu: "#6b4aa0",
	nctu: "#1f5f9f",
	green: "#2d5f4f",
	red: "#8d2f2f",
	gold: "#83621c",
	gray: "#666666",
	purple: "#4f4a62"
};

const baseText = {
	color: colors.ink,
	fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif"
};

const grid = {
	bottom: 38,
	containLabel: true,
	left: 8,
	right: 18,
	top: 30
};

const percentAxis = {
	axisLabel: { formatter: "{value}%" },
	splitLine: { lineStyle: { color: colors.line } }
};

const percentTooltip = (value: unknown) => `${Number(value).toFixed(1)}%`;
const numberTooltip = (value: unknown) => Number(value).toFixed(2);
const names = <T>(items: T[], pick: (item: T) => string) => items.map(pick);
const values = <T>(items: T[], pick: (item: T) => number) => items.map(pick);
const campusColor = (campus: string) => (campus === "清大" ? colors.nthu : colors.nctu);
const recoveryColor = (type: string) => {
	if (type.includes("未恢復")) return colors.red;
	if (type.includes("換電") || type.includes("修復")) return colors.nctu;
	if (type.includes("大量")) return colors.gold;
	if (type.includes("歸還")) return colors.green;
	return colors.gray;
};

const strategyOption = (scope: StrategyScope): EChartsCoreOption => {
	const rows = strategySeries[scope];
	const totalLine = (color: string) => ({
		color,
		type: "dashed",
		width: 2.1
	});
	const availableLine = (color: string) => ({
		color,
		type: "solid",
		width: 2.4
	});

	return {
		color: [colors.nthu, colors.nthu, colors.nctu, colors.nctu],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: numberTooltip },
		xAxis: { type: "category", data: names(rows, row => row.hour), axisLabel: { interval: 1 } },
		yAxis: { type: "value", name: "平均總車數", min: 0, splitLine: { lineStyle: { color: colors.line } } },
		series: [
			{ name: "清大總數", type: "line", data: values(rows, row => row.nthuTotal), lineStyle: totalLine(colors.nthu), itemStyle: { color: colors.nthu }, showSymbol: false },
			{ name: "清大可借", type: "line", data: values(rows, row => row.nthuAvailable), lineStyle: availableLine(colors.nthu), itemStyle: { color: colors.nthu }, showSymbol: false },
			{ name: "交大總數", type: "line", data: values(rows, row => row.nctuTotal), lineStyle: totalLine(colors.nctu), itemStyle: { color: colors.nctu }, showSymbol: false },
			{ name: "交大可借", type: "line", data: values(rows, row => row.nctuAvailable), lineStyle: availableLine(colors.nctu), itemStyle: { color: colors.nctu }, showSymbol: false }
		]
	};
};

export const chartOptions: Record<ChartId, EChartsCoreOption> = {
	"strategy-daily": strategyOption("每日整體"),
	"strategy-monday": strategyOption("星期一"),
	"strategy-friday": strategyOption("星期五"),
	"campus-comparison": {
		color: [colors.nthu, colors.nctu],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "category", data: ["缺車率", "低庫存率"] },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: campusMetrics.map(row => ({
			name: row.campus,
			type: "bar",
			data: [row.shortageRate, row.lowStockRate],
			itemStyle: { color: campusColor(row.campus) }
		}))
	},
	"station-risk": {
		color: [colors.gray, colors.red, colors.gold],
		grid: { ...grid, left: 12 },
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", max: 100, ...percentAxis },
		yAxis: {
			type: "category",
			data: names(stationRisks, row => row.station),
			inverse: true,
			axisLabel: { width: 124, overflow: "truncate" }
		},
		series: [
			{ name: "完全沒車", type: "bar", stack: "缺車", data: values(stationRisks, row => row.emptyStationRate) },
			{ name: "有車卻不能借", type: "bar", stack: "缺車", data: values(stationRisks, row => row.unavailableWithVehicleRate) },
			{ name: "低庫存率", type: "bar", data: values(stationRisks, row => row.lowStockRate) }
		]
	},
	"reason-signals": {
		color: [colors.red],
		grid: { ...grid, left: 12 },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", ...percentAxis },
		yAxis: {
			type: "category",
			data: names(reasonSignals, row => row.reason),
			inverse: true,
			axisLabel: { width: 128, overflow: "truncate" }
		},
		series: [{ name: "占風險訊號比例", type: "bar", data: values(reasonSignals, row => row.share) }]
	},
	"error-messages": {
		color: [colors.purple],
		grid: { ...grid, left: 12 },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", ...percentAxis },
		yAxis: {
			type: "category",
			data: names(errorMessages, row => row.message),
			inverse: true,
			axisLabel: { width: 128, overflow: "truncate" }
		},
		series: [{ name: "占全部車況觀測", type: "bar", data: values(errorMessages, row => row.share) }]
	},
	"battery-bands": {
		color: [colors.red, colors.purple],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: names(batteryBands, row => row.band), axisLabel: { interval: 0 } },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: [
			{ name: "不可借率", type: "bar", data: values(batteryBands, row => row.unavailableRate) },
			{ name: "errorMsg 比例", type: "line", data: batteryBands.map(row => (row.errorObservations / Math.max(row.total, 1)) * 100), symbolSize: 5 }
		]
	},
	"recovery-types": {
		color: [colors.nctu, colors.green, colors.gold, colors.red],
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "item" },
		series: [
			{
				name: "缺車後恢復",
				type: "pie",
				radius: ["35%", "64%"],
				center: ["50%", "45%"],
				data: recoveryTypes.map(row => ({ name: row.type, value: row.episodes, itemStyle: { color: recoveryColor(row.type) } })),
				label: { formatter: "{b}\n{d}%" }
			}
		]
	},
	"rebalance-events": {
		color: [colors.nctu],
		grid: { ...grid, left: 12, top: 20, bottom: 18 },
		tooltip: { trigger: "axis" },
		xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: colors.line } } },
		yAxis: {
			type: "category",
			data: names(rebalanceEvents, row => row.station),
			inverse: true,
			axisLabel: { width: 126, overflow: "truncate" }
		},
		series: [
			{
				name: "疑似大量回補事件",
				type: "bar",
				data: values(rebalanceEvents, row => row.events),
				itemStyle: { color: ({ dataIndex }: { dataIndex: number }) => campusColor(rebalanceEvents[dataIndex]?.campus ?? "") }
			}
		]
	}
};

export const mountCharts = () => {
	const instances: ReturnType<typeof echarts.init>[] = [];
	const observers: ResizeObserver[] = [];

	document.querySelectorAll<HTMLElement>("[data-chart]").forEach(element => {
		const chartId = element.dataset.chart as ChartId | undefined;
		const option = chartId ? chartOptions[chartId] : undefined;

		if (!option) return;

		const chart = echarts.init(element, null, { renderer: "svg" });
		chart.setOption(option);
		instances.push(chart);

		const observer = new ResizeObserver(() => chart.resize());
		observer.observe(element);
		observers.push(observer);
	});

	const resizeAll = () => instances.forEach(chart => chart.resize());
	window.addEventListener("resize", resizeAll);
	window.addEventListener("beforeprint", resizeAll);

	return () => {
		window.removeEventListener("resize", resizeAll);
		window.removeEventListener("beforeprint", resizeAll);
		observers.forEach(observer => observer.disconnect());
		instances.forEach(chart => chart.dispose());
	};
};
