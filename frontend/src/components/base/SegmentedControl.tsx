import type { ReactNode } from "react";
import type { WithDataTestId } from "./Common";

export interface SegmentedOption<T extends string> {
	value: T;
	label?: string;
	icon?: ReactNode;
	testId?: string;
}

export interface SegmentedControlProps<T extends string>
	extends Partial<WithDataTestId> {
	options: SegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
	size?: "sm" | "md";
}

export default function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	className = "",
	size = "md",
	testId,
}: SegmentedControlProps<T>) {
	const sizeClasses =
		size === "sm" ? "p-0.5 text-xs gap-1" : "p-1 text-sm gap-1.5";

	const itemSizeClasses = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";

	return (
		<div
			data-testid={testId}
			role="radiogroup"
			className={`inline-flex items-center rounded-xl bg-background-900 border border-background-700/60 ${sizeClasses} ${className}`}
		>
			{options.map((option) => {
				const isSelected = option.value === value;
				const optionTestId =
					option.testId || (testId ? `${testId}_${option.value}` : undefined);

				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={isSelected}
						title={option.label}
						data-testid={optionTestId}
						onClick={() => onChange(option.value)}
						className={`relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${itemSizeClasses} ${
							isSelected
								? "bg-background-700 text-foreground shadow-xs ring-4 ring-secondary-500/50"
								: "text-muted hover:text-foreground hover:bg-background-800/60"
						}`}
					>
						{option.icon && (
							<span className="h-4 w-4 shrink-0 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full">
								{option.icon}
							</span>
						)}
						{option.label && <span>{option.label}</span>}
					</button>
				);
			})}
		</div>
	);
}
