import type { ReactNode } from "react";

interface KpiCardProps {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	tone?: "neutral" | "positive" | "negative" | "info";
	testId?: string;
}

const toneStyles: Record<NonNullable<KpiCardProps["tone"]>, string> = {
	neutral: "text-foreground",
	positive: "text-emerald-400",
	negative: "text-rose-400",
	info: "text-sky-400",
};

const KpiCard = ({
	label,
	value,
	hint,
	tone = "neutral",
	testId,
}: KpiCardProps) => (
	<div
		data-testid={testId}
		className="flex flex-col gap-1 rounded-md bg-background-900 p-3 md:p-4"
	>
		<span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
		<span className={`text-2xl font-semibold ${toneStyles[tone]}`}>
			{value}
		</span>
		{hint && <span className="text-xs opacity-70">{hint}</span>}
	</div>
);

interface KpiGridProps {
	children: ReactNode;
	cols?: 2 | 3 | 4;
}

export const KpiGrid = ({ children, cols = 4 }: KpiGridProps) => {
	const gridCols =
		cols === 2
			? "grid-cols-1 sm:grid-cols-2"
			: cols === 3
				? "grid-cols-2 md:grid-cols-3"
				: "grid-cols-2 md:grid-cols-4";
	return <div className={`grid gap-3 ${gridCols}`}>{children}</div>;
};

export default KpiCard;
