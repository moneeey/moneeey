import type { ReactNode } from "react";
import type { WithDataTestId } from "./Common";

export interface ActionListItemProps extends Partial<WithDataTestId> {
	title: ReactNode;
	subtitle?: ReactNode;
	description?: ReactNode;
	badge?: ReactNode;
	icon?: ReactNode;
	actions?: ReactNode;
	isCurrent?: boolean;
	selected?: boolean;
	className?: string;
}

export function ActionListItem({
	title,
	subtitle,
	description,
	badge,
	icon,
	actions,
	isCurrent,
	selected,
	className = "",
	testId,
}: ActionListItemProps) {
	const activeCurrent = isCurrent || selected;
	const activeSubtitle = subtitle || description;
	return (
		<li
			data-testid={testId}
			className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-150 ${
				activeCurrent
					? "border-primary-500/80 bg-background-800 shadow-xs ring-1 ring-primary-500/30"
					: "border-background-700/60 bg-background-900/90 hover:border-background-700 hover:bg-background-800/50"
			} ${className}`}
		>
			<div className="flex items-center gap-3 min-w-0 flex-1">
				{icon && <div className="text-muted shrink-0">{icon}</div>}
				<div className="flex flex-col min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium truncate text-foreground">
							{title}
						</span>
						{badge}
					</div>
					{activeSubtitle && (
						<div className="text-xs text-muted mt-0.5 truncate">
							{activeSubtitle}
						</div>
					)}
				</div>
			</div>
			{actions && (
				<div className="flex items-center gap-2 shrink-0">{actions}</div>
			)}
		</li>
	);
}

export interface ActionListProps extends Partial<WithDataTestId> {
	children: ReactNode;
	className?: string;
}

export default function ActionList({
	children,
	className = "",
	testId,
}: ActionListProps) {
	return (
		<ul data-testid={testId} className={`flex flex-col gap-2.5 ${className}`}>
			{children}
		</ul>
	);
}
