import { ResponsiveSankey } from "@nivo/sankey";

import { colorForKey, useNivoTheme } from "../nivoTheme";

export interface SankeyNode {
	id: string;
}

export interface SankeyLink {
	source: string;
	target: string;
	value: number;
}

export interface SankeyData {
	nodes: SankeyNode[];
	links: SankeyLink[];
}

interface ReportSankeyChartProps {
	data: SankeyData;
	height?: string | number;
	onNodeClick?: (info: { node: string; value: number }) => void;
}

const ReportSankeyChart = ({
	data,
	height = "28em",
	onNodeClick,
}: ReportSankeyChartProps) => {
	const theme = useNivoTheme();
	if (data.nodes.length === 0 || data.links.length === 0) return null;

	return (
		<div style={{ height, width: "100%" }}>
			<ResponsiveSankey
				data={data}
				theme={theme}
				colors={(node) => colorForKey(String(node.id))}
				margin={{ top: 12, right: 120, bottom: 12, left: 120 }}
				align="justify"
				nodeOpacity={0.9}
				nodeHoverOpacity={1}
				nodeThickness={14}
				nodeSpacing={16}
				nodeBorderWidth={0}
				linkOpacity={0.45}
				linkHoverOpacity={0.7}
				linkContract={2}
				enableLinkGradient={true}
				labelPosition="outside"
				labelOrientation="horizontal"
				labelPadding={8}
				animate={true}
				motionConfig="gentle"
				onClick={(node) => {
					if ("id" in node) {
						onNodeClick?.({
							node: String(node.id),
							value: Number(("value" in node && node.value) || 0),
						});
					}
				}}
			/>
		</div>
	);
};

export default ReportSankeyChart;
