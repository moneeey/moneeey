import type { ReactNode } from "react";
import useMessages from "../../utils/Messages";
import { FavIcon } from "./Icon";

export default function MinimalBasicScreen({
	children,
}: { children: ReactNode }) {
	const Messages = useMessages();
	return (
		<div className="flex justify-center items-center min-h-screen bg-background-600 ">
			<div className="flex flex-col items-center gap-4 md:scale-150 pb-32">
				<h1
					className="flex flex-row gap-2 scale-150 pb-4"
					data-testid="minimalScreenTitle"
				>
					<FavIcon /> {Messages.tour.welcome}
				</h1>
				{children}
			</div>
		</div>
	);
}
