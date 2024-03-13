import type { ReactNode } from "react";

import type { ClassNameType } from "../../utils/Utils";

import type { WithDataTestId } from "./Common";

const BaseSpace = (baseClassname: ClassNameType) =>
	function Spacer({
		children,
		className,
		testId,
	}: {
		children: ReactNode | ReactNode[];
		className?: string;
	} & Partial<WithDataTestId>) {
		return (
			<div
				className={` ${baseClassname || ""} ${className || ""}`}
				data-testid={testId}
			>
				{children}
			</div>
		);
	};

export const Space = BaseSpace("flex flex-row items-center gap-4");
export const VerticalSpace = BaseSpace("flex flex-col gap-4");
export default Space;
