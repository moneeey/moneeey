import { ResponsiveSunburst } from "@nivo/sunburst";

import { colorForKey, useNivoTheme } from "../nivoTheme";

export interface SunburstNode {
	id: string;
	value?: number;
	children?: SunburstNode[];
}

interface ReportSunburstChartProps {
	data: SunburstNode;
	height?: string | number;
	onNodeClick?: (info: { path: string; value: number }) => void;
}

const ReportSunburstChart = ({
	data,
	height = "28em",
	onNodeClick,
}: ReportSunburstChartProps) => {
	const theme = useNivoTheme();
	if (!data.children || data.children.length === 0) return null;

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveSunburst
				data={data}
				theme={theme}
				id="id"
				value="value"
				cornerRadius={2}
				borderWidth={1}
				borderColor={{ theme: "background" }}
				colors={(node) => colorForKey(String(node.id))}
				childColor={{ from: "color", modifiers: [["brighter", 0.15]] }}
				enableArcLabels={true}
				arcLabelsSkipAngle={12}
				arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
				animate={true}
				motionConfig="gentle"
				onClick={(node) =>
					onNodeClick?.({
						path: String(node.id),
						value: Number(node.value || 0),
					})
				}
			/>
		</div>
	);
};

export default ReportSunburstChart;
