import { useMemo } from "react";
import colors from "tailwindcss/colors";

const cssVar = (name: string, fallback = "0 0 0"): string => {
	if (typeof document === "undefined") return `rgb(${fallback})`;
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return raw ? `rgb(${raw})` : `rgb(${fallback})`;
};

export const useNivoTheme = () => {
	return useMemo(() => {
		const foreground = cssVar("--text-default", "241 245 249");
		const muted = cssVar("--text-muted", "148 163 184");
		const grid = cssVar("--bg-700", "63 63 70");
		const tooltipBg = cssVar("--bg-100", "24 24 27");
		const tooltipFg = foreground;

		return {
			background: "transparent",
			textColor: foreground,
			fontSize: 12,
			fontFamily: "inherit",
			axis: {
				domain: { line: { stroke: grid, strokeWidth: 1 } },
				legend: { text: { fill: muted, fontSize: 12 } },
				ticks: {
					line: { stroke: grid, strokeWidth: 1 },
					text: { fill: muted, fontSize: 11 },
				},
			},
			grid: { line: { stroke: grid, strokeDasharray: "3 3", strokeWidth: 1 } },
			legends: { text: { fill: foreground, fontSize: 12 } },
			tooltip: {
				container: {
					background: tooltipBg,
					color: tooltipFg,
					fontSize: 12,
					borderRadius: 6,
					boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
					padding: "8px 10px",
				},
			},
			labels: { text: { fill: foreground, fontWeight: 500 } },
			crosshair: { line: { stroke: muted, strokeOpacity: 0.4 } },
		} as const;
	}, []);
};

export const REPORT_PALETTE: readonly string[] = [
	colors.emerald[400],
	colors.cyan[400],
	colors.yellow[400],
	colors.orange[400],
	colors.violet[400],
	colors.teal[400],
	colors.blue[400],
	colors.green[400],
	colors.fuchsia[400],
	colors.lime[400],
	colors.pink[400],
	colors.purple[400],
	colors.sky[400],
	colors.red[400],
	colors.amber[400],
	colors.indigo[400],
	colors.rose[400],
];

export const colorForKey = (key: string, palette = REPORT_PALETTE): string => {
	let hash = 0;
	for (let i = 0; i < key.length; i += 1) {
		hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
	}
	return palette[hash % palette.length];
};

export const SIGN_PALETTE = {
	positive: colors.emerald[400],
	negative: colors.rose[400],
	neutral: colors.slate[400],
} as const;
