import type { ReactNode } from "react";
import useMessages from "../../utils/Messages";
import { FavIcon } from "./Icon";

export default function MinimalBasicScreen({
	children,
}: { children: ReactNode }) {
	const Messages = useMessages();
	return (
		<div className="fixed inset-0 bg-background-600 overflow-y-auto">
			<div className="min-h-full flex flex-col items-center justify-center py-8">
				<div className="flex flex-col items-center gap-4 w-full max-w-2xl px-4">
					<h1
						className="flex flex-row scale-125"
						data-testid="minimalScreenTitle"
					>
						<FavIcon /> <span className="ml-2">{Messages.tour.welcome}</span>
					</h1>
					{children}
				</div>
			</div>
		</div>
	);
}
