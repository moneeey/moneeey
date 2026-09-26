import type { ReactNode } from "react";
import type { WithDataTestId } from "./Common";

export type CardVariant = "default" | "elevated" | "outlined" | "sunken";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends Partial<WithDataTestId> {
	className?: string;
	header?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
	variant?: CardVariant;
	padding?: CardPadding;
}

const variantStyles: Record<CardVariant, string> = {
	default: "bg-background-800 border border-background-700/60 shadow-xs",
	elevated: "bg-background-800 border border-background-700/80 shadow-md",
	outlined: "bg-transparent border border-background-700",
	sunken: "bg-background-900 border border-background-800",
};

const paddingStyles: Record<CardPadding, string> = {
	none: "p-0",
	sm: "p-2.5",
	md: "p-4",
	lg: "p-6",
};

const Card = ({
	testId,
	header,
	children,
	footer,
	className = "",
	variant = "default",
	padding = "md",
}: CardProps) => (
	<article
		className={`rounded-xl transition-all duration-150 flex flex-col ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
		data-testid={testId}
	>
		{header && (
			<header className={`shrink-0 ${padding === "none" ? "" : "mb-3"}`}>
				{header}
			</header>
		)}
		<div className="flex-1 min-h-0 min-w-0">{children}</div>
		{footer && (
			<footer className="mt-4 pt-3 border-t border-background-700/40 shrink-0">
				{footer}
			</footer>
		)}
	</article>
);

export default Card;
