import { LinkButton } from "../../components/base/Button";

import { colorForKey } from "./nivoTheme";

interface ChartLegendProps {
	series: string[];
	hidden: ReadonlySet<string>;
	onToggle: (series: string) => void;
	colorMap?: Record<string, string>;
	dimmedSeries?: ReadonlySet<string>;
}

const ChartLegend = ({
	series,
	hidden,
	onToggle,
	colorMap,
	dimmedSeries,
}: ChartLegendProps) => {
	if (series.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2" data-testid="chartLegend">
			{series.map((s) => {
				const isHidden = hidden.has(s);
				const isDimmed = dimmedSeries?.has(s) ?? false;
				const color = colorMap?.[s] ?? colorForKey(s);
				return (
					<LinkButton
						compact
						key={s}
						onClick={() => onToggle(s)}
						className={`inline-flex items-center gap-1.5 rounded-full bg-background-900 px-2.5 py-1 text-xs no-underline transition hover:bg-background-700 ${
							isHidden ? "opacity-40" : ""
						} ${isDimmed ? "border border-dashed border-foreground/30" : ""}`}
						testId={`legendChip_${s}`}
					>
						<span
							className="inline-block h-2.5 w-2.5 rounded-sm"
							style={{
								background: color,
								opacity: isDimmed ? 0.55 : 1,
							}}
						/>
						<span
							className={`${isHidden ? "line-through" : ""} ${isDimmed ? "italic opacity-80" : ""}`}
						>
							{s}
						</span>
					</LinkButton>
				);
			})}
		</div>
	);
};

export default ChartLegend;
