import type { ReactNode } from "react";

interface LoadingProps {
	loading: boolean;
	progress?: number;
	children: ReactNode | ReactNode[];
}

export default function Loading(props: LoadingProps) {
	return (
		<>
			{props.loading && (
				<div
					data-testid="loadingProgress"
					className="absolute z-50 flex h-full w-full items-center justify-center"
				>
					<div className="flex w-2/3 border border-background-400 bg-background-200">
						<div
							className="h-6 w-1/2 bg-primary-500"
							style={{ width: `${props.progress || ""}%` }}
						>
							&nbsp;
						</div>
					</div>
				</div>
			)}
			{props.children}
		</>
	);
}
