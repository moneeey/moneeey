import type { ReactNode } from "react";
import type { WithDataTestId } from "./Common";

interface DrawerProps {
	className?: string;
	header?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
	onClose?: () => void;
}

const Drawer = ({
	testId,
	header,
	children,
	footer,
	className,
	onClose,
}: DrawerProps & WithDataTestId) => (
	<div
		className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in"
		onClick={(e) => {
			if (e.target === e.currentTarget && onClose) {
				onClose();
			}
		}}
		onKeyDown={(e) => {
			if (e.target === e.currentTarget && e.key === "Escape" && onClose) {
				onClose();
			}
		}}
	>
		<article
			className={`relative h-full w-full max-w-md bg-background-800 border-l border-background-700/80 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto ${
				className || ""
			}`}
			data-testid={testId}
		>
			<div className="flex flex-col gap-4">
				{header && (
					<header className="pb-3 border-b border-background-700/50">
						{header}
					</header>
				)}
				<div className="flex flex-col gap-3">{children}</div>
			</div>
			{footer && (
				<footer className="pt-4 border-t border-background-700/50 mt-4">
					{footer}
				</footer>
			)}
		</article>
	</div>
);

export default Drawer;
