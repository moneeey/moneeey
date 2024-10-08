import type { ReactNode } from "react";

import type { WithDataTestId } from "./Common";

interface TextProps extends Partial<WithDataTestId> {
	onClick?: () => void;
	children: string | ReactNode | ReactNode[];
	className?: string;
	title?: string;
}

type BaseElementType = Extract<
	keyof JSX.IntrinsicElements,
	"p" | "span" | "h1" | "h2"
>;

const BaseText = (
	clzz: HTMLElement["className"],
	ElementTyp: BaseElementType,
) =>
	function Text({ children, className, title, onClick, testId }: TextProps) {
		return (
			<ElementTyp
				className={`${clzz} ${className || ""}`}
				onClick={onClick}
				title={title}
				data-testid={testId}
			>
				{children}
			</ElementTyp>
		);
	};

const TextTitle = BaseText("text-xl", "h1");
const TextSubtitle = BaseText("", "h2");
const TextParagraph = BaseText("", "p");
const TextNormal = BaseText("", "span");
const TextSecondary = BaseText("opacity-75", "span");
const TextDanger = BaseText("text-red-500", "span");
const TextWarning = BaseText("text-yellow-500", "span");
const TextSuccess = BaseText("text-green-500", "span");

export {
	TextTitle,
	TextSubtitle,
	TextParagraph,
	TextNormal,
	TextSecondary,
	TextDanger,
	TextWarning,
	TextSuccess,
};
