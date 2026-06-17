import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import type { EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";

import { batteryBands, campusComparison, errorMessages, fridayStrategy, highRiskHours, rebalanceEvents, recoveryTypes, stationRisks, unavailableStations, vehicleSignals } from "./data";

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, SVGRenderer]);

export type ChartId =
	| "high-risk-hours"
	| "friday-strategy"
	| "campus-comparison"
	| "station-risk"
	| "vehicle-signals"
	| "error-messages"
	| "battery-bands"
	| "rebalance-events"
	| "recovery-types"
	| "unavailable-stations";

const colors = {
	blue: "#1f4e79",
	gold: "#83621c",
	green: "#2d5f4f",
	red: "#8d2f2f",
	ink: "#111111",
	muted: "#555555",
	line: "#d2d2d2",
	purple: "#4f4a62"
};

const percentTooltip = (value: unknown) => `${Number(value).toFixed(1)}%`;

const percentAxis = {
	axisLabel: {
		formatter: "{value}%"
	},
	splitLine: {
		lineStyle: {
			color: colors.line
		}
	}
};

const baseText = {
	color: colors.ink,
	fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif"
};

const grid = {
	bottom: 42,
	containLabel: true,
	left: 8,
	right: 18,
	top: 42
};

const barRadius = 0;

const names = <T>(items: T[], pick: (item: T) => string) => items.map(pick);
const values = <T>(items: T[], pick: (item: T) => number) => items.map(pick);

export const chartOptions: Record<ChartId, EChartsCoreOption> = {
	"high-risk-hours": {
		color: [colors.red, colors.gold, colors.green],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "category", data: names(highRiskHours, item => item.hour), axisTick: { alignWithLabel: true } },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: [
			{ name: "缺車率", type: "bar", data: values(highRiskHours, item => item.shortageRate), itemStyle: { borderRadius: barRadius } },
			{ name: "低庫存率", type: "bar", data: values(highRiskHours, item => item.lowStockRate), itemStyle: { borderRadius: barRadius } },
			{ name: "平均可用率", type: "line", data: values(highRiskHours, item => item.availabilityRate), symbolSize: 7 }
		]
	},
	"friday-strategy": {
		color: [colors.green, colors.red, colors.blue],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: names(fridayStrategy, item => item.hour), axisLabel: { interval: 1 } },
		yAxis: [
			{ type: "value", name: "平均車數", min: 0, splitLine: { lineStyle: { color: colors.line } } },
			{ type: "value", name: "比例", max: 100, ...percentAxis }
		],
		series: [
			{ name: "平均可用車數", type: "bar", data: values(fridayStrategy, item => item.availableAverage), itemStyle: { borderRadius: barRadius }, yAxisIndex: 0 },
			{ name: "缺車率", type: "line", data: values(fridayStrategy, item => item.shortageRate), symbolSize: 5, yAxisIndex: 1 },
			{ name: "平均可用率", type: "line", data: values(fridayStrategy, item => item.availabilityRate), symbolSize: 5, yAxisIndex: 1 }
		]
	},
	"campus-comparison": {
		color: [colors.red, colors.gold, colors.green],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "category", data: names(campusComparison, item => item.campus) },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: [
			{ name: "缺車率", type: "bar", data: values(campusComparison, item => item.shortageRate), itemStyle: { borderRadius: barRadius } },
			{ name: "低庫存率", type: "bar", data: values(campusComparison, item => item.lowStockRate), itemStyle: { borderRadius: barRadius } },
			{ name: "平均可用率", type: "bar", data: values(campusComparison, item => item.availabilityRate), itemStyle: { borderRadius: barRadius } }
		]
	},
	"station-risk": {
		color: [colors.red, colors.gold, colors.blue],
		grid: { ...grid, left: 12 },
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", max: 100, ...percentAxis },
		yAxis: {
			type: "category",
			data: names(stationRisks, item => item.station),
			inverse: true,
			axisLabel: { width: 118, overflow: "truncate" }
		},
		series: [
			{ name: "缺車率", type: "bar", data: values(stationRisks, item => item.shortageRate), itemStyle: { borderRadius: barRadius } },
			{ name: "低庫存率", type: "bar", data: values(stationRisks, item => item.lowStockRate), itemStyle: { borderRadius: barRadius } },
			{ name: "高風險時段缺車率", type: "bar", data: values(stationRisks, item => item.highRiskShortageRate), itemStyle: { borderRadius: barRadius } }
		]
	},
	"vehicle-signals": {
		color: [colors.blue],
		grid,
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "category", data: names(vehicleSignals, item => item.signal), axisLabel: { interval: 0, rotate: 24 } },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: [{ name: "出現比例", type: "bar", data: values(vehicleSignals, item => item.prevalence), itemStyle: { borderRadius: barRadius } }]
	},
	"error-messages": {
		color: [colors.purple],
		grid: { ...grid, left: 12 },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", ...percentAxis },
		yAxis: {
			type: "category",
			data: names(errorMessages, item => item.message),
			inverse: true,
			axisLabel: { width: 120, overflow: "truncate" }
		},
		series: [{ name: "占全部車輛觀測比例", type: "bar", data: values(errorMessages, item => item.rate), itemStyle: { borderRadius: barRadius } }]
	},
	"battery-bands": {
		color: [colors.red, colors.green],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "category", data: names(batteryBands, item => item.band), axisLabel: { interval: 0 } },
		yAxis: { type: "value", max: 100, ...percentAxis },
		series: [
			{ name: "不可借比例", type: "bar", data: values(batteryBands, item => item.unavailableRate), itemStyle: { borderRadius: barRadius } },
			{ name: "可借比例", type: "line", data: values(batteryBands, item => 100 - item.unavailableRate), symbolSize: 6 }
		]
	},
	"rebalance-events": {
		color: [colors.green, colors.gold, colors.blue, colors.red, colors.purple, "#777777", "#aaaaaa"],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "item", valueFormatter: (value: unknown) => `${value} 次` },
		series: [
			{
				name: "疑似大量回補事件",
				type: "pie",
				radius: ["36%", "66%"],
				center: ["50%", "45%"],
				data: rebalanceEvents.map(item => ({ name: item.station, value: item.events })),
				label: { formatter: "{b}\n{d}%" }
			}
		]
	},
	"recovery-types": {
		color: [colors.green, colors.red, colors.gold],
		grid,
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "item", valueFormatter: (value: unknown) => `${value} episodes` },
		series: [
			{
				name: "缺車後恢復類型",
				type: "pie",
				radius: ["34%", "64%"],
				center: ["50%", "45%"],
				data: recoveryTypes.map(item => ({ name: item.type, value: item.episodes })),
				label: { formatter: "{b}\n{d}%" }
			}
		]
	},
	"unavailable-stations": {
		color: [colors.red, colors.gold, colors.blue, colors.green],
		grid: { ...grid, left: 12 },
		legend: { bottom: 0, textStyle: baseText },
		tooltip: { trigger: "axis", valueFormatter: percentTooltip },
		xAxis: { type: "value", max: 100, ...percentAxis },
		yAxis: {
			type: "category",
			data: names(unavailableStations, item => item.station),
			inverse: true,
			axisLabel: { width: 118, overflow: "truncate" }
		},
		series: [
			{ name: "不可借比例", type: "bar", data: values(unavailableStations, item => item.unavailableRate), itemStyle: { borderRadius: barRadius } },
			{ name: "低電量且不可借", type: "bar", data: values(unavailableStations, item => item.lowBatteryUnavailableRate), itemStyle: { borderRadius: barRadius } },
			{ name: "GPS 異常", type: "bar", data: values(unavailableStations, item => item.gpsAbnormalRate), itemStyle: { borderRadius: barRadius } },
			{ name: "平均電量", type: "line", data: values(unavailableStations, item => item.averageBattery), symbolSize: 5 }
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
