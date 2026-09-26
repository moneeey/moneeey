import type { ReactNode } from "react";
import type { WithDataTestId } from "./Common";

export type BadgeTone =
	| "neutral"
	| "positive"
	| "negative"
	| "warning"
	| "info"
	| "primary";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends Partial<WithDataTestId> {
	children: ReactNode;
	tone?: BadgeTone;
	size?: BadgeSize;
	className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
	neutral: "bg-background-700/60 text-muted border-background-600/60",
	positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
	negative: "bg-rose-500/10 text-rose-400 border-rose-500/25",
	warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
	info: "bg-sky-500/10 text-sky-400 border-sky-500/25",
	primary: "bg-primary-500/10 text-primary-400 border-primary-500/25",
};

const sizeStyles: Record<BadgeSize, string> = {
	sm: "text-xs px-2 py-0.5",
	md: "text-xs px-2.5 py-1",
};

export default function Badge({
	children,
	tone = "neutral",
	size = "sm",
	className = "",
	testId,
}: BadgeProps) {
	return (
		<span
			data-testid={testId}
			className={`inline-flex items-center font-medium rounded-full border ${toneStyles[tone]} ${sizeStyles[size]} ${className}`}
		>
			{children}
		</span>
	);
}
