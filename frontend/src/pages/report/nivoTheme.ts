import { useMemo } from "react";

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
		const tooltipBg = cssVar("--bg-900", "9 9 11");
		const tooltipBorder = cssVar("--bg-700", "63 63 70");
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
					border: `1px solid ${tooltipBorder}`,
					boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
					padding: "8px 10px",
				},
			},
			labels: { text: { fill: foreground, fontWeight: 500 } },
			crosshair: { line: { stroke: muted, strokeOpacity: 0.4 } },
		} as const;
	}, []);
};

export const REPORT_PALETTE: readonly string[] = [
	"#34d399",
	"#22d3ee",
	"#facc15",
	"#fb923c",
	"#a78bfa",
	"#2dd4bf",
	"#60a5fa",
	"#4ade80",
	"#e879f9",
	"#a3e635",
	"#f472b6",
	"#c084fc",
	"#38bdf8",
	"#f87171",
	"#fbbf24",
	"#818cf8",
	"#fb7185",
];

export const colorForKey = (key: string, palette = REPORT_PALETTE): string => {
	let hash = 0;
	for (let i = 0; i < key.length; i += 1) {
		hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
	}
	return palette[hash % palette.length];
};

export const SIGN_PALETTE = {
	positive: "#34d399",
	negative: "#fb7185",
	neutral: "#94a3b8",
} as const;

export const fadeColor = (color: string, alpha: number): string => {
	if (color.startsWith("rgba(")) return color;
	if (color.startsWith("rgb(")) {
		const inner = color.slice(4, -1);
		return `rgba(${inner}, ${alpha})`;
	}
	if (color.startsWith("#")) {
		const hex = color.slice(1);
		const expand =
			hex.length === 3
				? hex
						.split("")
						.map((c) => c + c)
						.join("")
				: hex;
		const r = Number.parseInt(expand.slice(0, 2), 16);
		const g = Number.parseInt(expand.slice(2, 4), 16);
		const b = Number.parseInt(expand.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return color;
};
