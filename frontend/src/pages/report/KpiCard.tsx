import type { ReactNode } from "react";
import usePrivacyMode from "../../utils/usePrivacyMode";

interface KpiCardProps {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	tone?: "neutral" | "positive" | "negative" | "info";
	testId?: string;
	monetary?: boolean;
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
	monetary = true,
}: KpiCardProps) => {
	const privacy = usePrivacyMode();
	const shouldBlur = privacy && monetary;

	return (
		<div
			data-testid={testId}
			className="flex flex-col gap-1.5 rounded-xl border border-background-700/60 bg-background-900 p-4 shadow-xs"
		>
			<span className="text-xs uppercase tracking-wider text-muted font-medium">
				{label}
			</span>
			<span
				data-privacy-blur={monetary ? "true" : undefined}
				className={`text-2xl font-bold tracking-tight ${toneStyles[tone]} ${
					shouldBlur ? "select-none filter blur-xs" : ""
				}`}
			>
				{value}
			</span>
			{hint && (
				<span
					data-privacy-blur={monetary ? "true" : undefined}
					className={`text-xs text-muted/80 ${
						shouldBlur ? "select-none filter blur-xs" : ""
					}`}
				>
					{hint}
				</span>
			)}
		</div>
	);
};

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
