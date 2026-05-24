import { ResponsiveBar } from "@nivo/bar";
import { useMemo } from "react";

import type { TDate } from "../../../utils/Date";
import type { ReportDataMap } from "../ReportUtils";
import { REPORT_PALETTE, colorForKey, useNivoTheme } from "../nivoTheme";

interface ReportBarChartProps {
	data: ReportDataMap;
	xFormatter: (v: TDate) => string;
	stacked?: boolean;
	hiddenSeries?: ReadonlySet<string>;
	onBarClick?: (info: { period: TDate; series: string; value: number }) => void;
	height?: string | number;
	colorMap?: Record<string, string>;
}

const ReportBarChart = ({
	data,
	xFormatter,
	stacked = true,
	hiddenSeries,
	onBarClick,
	height = "24em",
	colorMap,
}: ReportBarChartProps) => {
	const theme = useNivoTheme();

	const { keys, rows } = useMemo(() => {
		const cols = Array.from(data.columns).filter((c) => !hiddenSeries?.has(c));
		const points = Array.from(data.points.entries()).sort(([a], [b]) =>
			a.localeCompare(b),
		);
		const rowData = points.map(([date, record]) => {
			const row: Record<string, number | string> = { period: date };
			for (const col of cols) row[col] = record[col] ?? 0;
			return row;
		});
		return { keys: cols, rows: rowData };
	}, [data, hiddenSeries]);

	const colorBy = useMemo(() => {
		if (!colorMap) return undefined;
		return (bar: { id: string | number }) =>
			colorMap[String(bar.id)] ?? colorForKey(String(bar.id));
	}, [colorMap]);

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveBar
				data={rows}
				keys={keys}
				indexBy="period"
				groupMode={stacked ? "stacked" : "grouped"}
				theme={theme}
				colors={colorBy ?? [...REPORT_PALETTE]}
				colorBy="id"
				margin={{ top: 12, right: 24, bottom: 56, left: 64 }}
				padding={0.2}
				innerPadding={stacked ? 0 : 2}
				axisBottom={{
					tickSize: 4,
					tickPadding: 6,
					tickRotation: -25,
					format: (v: string) => xFormatter(v),
				}}
				axisLeft={{ tickSize: 4, tickPadding: 6 }}
				enableLabel={false}
				animate={true}
				motionConfig="gentle"
				onClick={(bar) =>
					onBarClick?.({
						period: String(bar.indexValue),
						series: String(bar.id),
						value: Number(bar.value ?? 0),
					})
				}
				tooltip={({ id, value, indexValue, color }) => (
					<div style={theme.tooltip.container}>
						<div style={{ fontWeight: 600, marginBottom: 4 }}>
							{xFormatter(String(indexValue))}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span
								style={{
									width: 10,
									height: 10,
									background: color,
									borderRadius: 2,
									display: "inline-block",
								}}
							/>
							<span>
								{id}: {value}
							</span>
						</div>
					</div>
				)}
			/>
		</div>
	);
};

export default ReportBarChart;
