import { colorForKey } from "./nivoTheme";

interface ChartLegendProps {
	series: string[];
	hidden: ReadonlySet<string>;
	onToggle: (series: string) => void;
	colorMap?: Record<string, string>;
}

const ChartLegend = ({
	series,
	hidden,
	onToggle,
	colorMap,
}: ChartLegendProps) => {
	if (series.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2" data-testid="chartLegend">
			{series.map((s) => {
				const isHidden = hidden.has(s);
				const color = colorMap?.[s] ?? colorForKey(s);
				return (
					<button
						type="button"
						key={s}
						onClick={() => onToggle(s)}
						className={`inline-flex items-center gap-1.5 rounded-full bg-background-900 px-2.5 py-1 text-xs transition hover:bg-background-700 ${
							isHidden ? "opacity-40" : ""
						}`}
						data-testid={`legendChip_${s}`}
					>
						<span
							className="inline-block h-2.5 w-2.5 rounded-sm"
							style={{ background: color }}
						/>
						<span className={isHidden ? "line-through" : ""}>{s}</span>
					</button>
				);
			})}
		</div>
	);
};

export default ChartLegend;
