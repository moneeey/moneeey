import { ResponsiveLine } from "@nivo/line";
import { useMemo } from "react";

import type { TDate } from "../../../utils/Date";
import type { ReportDataMap } from "../ReportUtils";
import { formatNumber } from "../kpiCalcs";
import {
	REPORT_PALETTE,
	colorForKey,
	fadeColor,
	useNivoTheme,
} from "../nivoTheme";

interface ReportLineChartProps {
	data: ReportDataMap;
	xFormatter: (v: TDate) => string;
	hiddenSeries?: ReadonlySet<string>;
	dimmedSeries?: ReadonlySet<string>;
	onPointClick?: (info: {
		period: TDate;
		series: string;
		value: number;
	}) => void;
	height?: string | number;
	colorMap?: Record<string, string>;
	curve?: "linear" | "monotoneX" | "catmullRom" | "step";
	enableArea?: boolean;
}

const ReportLineChart = ({
	data,
	xFormatter,
	hiddenSeries,
	dimmedSeries,
	onPointClick,
	height = "24em",
	colorMap,
	curve = "monotoneX",
	enableArea = false,
}: ReportLineChartProps) => {
	const theme = useNivoTheme();

	const series = useMemo(() => {
		const cols = Array.from(data.columns).filter((c) => !hiddenSeries?.has(c));
		const points = Array.from(data.points.entries()).sort(([a], [b]) =>
			a.localeCompare(b),
		);
		return cols.map((col) => ({
			id: col,
			data: points.map(([date, record]) => ({
				x: date,
				y: record[col] ?? 0,
			})),
		}));
	}, [data, hiddenSeries]);

	const colors = useMemo(() => {
		const map = colorMap ?? {};
		return series.map((s) => {
			const base = map[s.id] ?? colorForKey(s.id);
			return dimmedSeries?.has(s.id) ? fadeColor(base, 0.45) : base;
		});
	}, [series, colorMap, dimmedSeries]);

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveLine
				data={series}
				theme={theme}
				colors={colors.length > 0 ? colors : [...REPORT_PALETTE]}
				margin={{ top: 12, right: 24, bottom: 56, left: 64 }}
				xScale={{ type: "point" }}
				yScale={{ type: "linear", stacked: false, min: "auto", max: "auto" }}
				axisBottom={{
					tickSize: 4,
					tickPadding: 6,
					tickRotation: -25,
					format: (v: string) => xFormatter(v),
				}}
				axisLeft={{
					tickSize: 4,
					tickPadding: 6,
					format: (v) => formatNumber(Number(v), 0),
				}}
				curve={curve}
				enableArea={enableArea}
				areaOpacity={0.15}
				lineWidth={2}
				pointSize={5}
				pointBorderWidth={1}
				pointBorderColor={{ from: "serieColor" }}
				useMesh={true}
				enableCrosshair={true}
				crosshairType="x"
				onClick={(node) => {
					if (!onPointClick) return;
					if ("data" in node) {
						onPointClick({
							period: String(node.data.x),
							series: String(node.seriesId),
							value: Number(node.data.y ?? 0),
						});
					}
				}}
				animate={true}
				motionConfig="gentle"
				tooltip={({ point }) => (
					<div style={theme.tooltip.container}>
						<div style={{ fontWeight: 600, marginBottom: 4 }}>
							{xFormatter(String(point.data.x))}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span
								style={{
									width: 10,
									height: 10,
									background: point.seriesColor,
									borderRadius: 2,
									display: "inline-block",
								}}
							/>
							<span>
								{point.seriesId}: {formatNumber(Number(point.data.y))}
							</span>
						</div>
					</div>
				)}
			/>
		</div>
	);
};

export default ReportLineChart;
