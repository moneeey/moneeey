import type { ReactNode } from "react";

import type { WithDataTestId } from "./Common";

interface CardProps {
	className?: string;
	header: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
}

const Card = ({
	testId,
	header,
	children,
	footer,
	className,
}: CardProps & WithDataTestId) => (
	<article className={`${className || ""}`} data-testid={testId}>
		<header>{header}</header>
		<article className="h-full">{children}</article>
		<footer className="mt-4">{footer}</footer>
	</article>
);

export default Card;
