import { ReactNode } from "react";

import { WithDataTestId } from "./Common";
import { VerticalSpace } from "./Space";

interface DrawerProps {
	className?: string;
	header: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
}

const Drawer = ({
	testId,
	header,
	children,
	footer,
	className,
}: DrawerProps & WithDataTestId) => (
	<article
		className={`fixed bottom-0 right-0 top-0 z-50 w-80 bg-background-600 p-4 ${
			className || ""
		}`}
		data-testid={testId}
	>
		<VerticalSpace>
			<header>{header}</header>
			<article>{children}</article>
			<footer>{footer}</footer>
		</VerticalSpace>
	</article>
);

export default Drawer;
