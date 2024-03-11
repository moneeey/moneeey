import { omit } from "lodash";
import { ReactNode } from "react";

import { TMessages, WithMessages } from "../../utils/Messages";
import { slugify } from "../../utils/Utils";

import { WithDataTestId } from "./Common";
import Space from "./Space";

type ButtonType = "primary" | "secondary" | "link" | "danger";

type ButtonProps = Partial<WithDataTestId> & {
	onClick: () => void;
	title?: string;
	children?: string | ReactNode | ReactNode[];
	className?: string;
	disabled?: boolean;
};

type WithButtonKind = {
	kind: ButtonType;
};

const styles: Record<ButtonType, string> = {
	primary: "bg-primary-300 text-primary-900 hover:opacity-75",
	secondary: "bg-secondary-300 text-secondary-900 hover:opacity-75",
	link: "bg-transparent border-0 underline hover:opacity-75",
	danger: "bg-danger-300 text-danger-900 hover:opacity-75",
};

const Button = ({ kind, ...base }: Partial<ButtonProps> & WithButtonKind) =>
	function BaseButton(props: ButtonProps) {
		return (
			<button
				{...omit(base, ["testId"])}
				{...omit(props, ["testId"])}
				data-testid={props.testId || base.testId}
				className={`flex whitespace-nowrap rounded p-2 ${styles[kind]} ${
					props.className || ""
				}`}
			>
				{props.children || props.title || base.title}
			</button>
		);
	};

export const PrimaryButton = Button({
	kind: "primary",
	testId: "primary-button",
});
export const SecondaryButton = Button({
	kind: "secondary",
	testId: "secondary-button",
});
export const LinkButton = Button({ kind: "link", testId: "link-button" });

function ButtonWithMessages(
	generator: (Messages: TMessages) => Partial<ButtonProps> & WithButtonKind,
) {
	return function ButtonWithMessagess(props: ButtonProps) {
		return (
			<WithMessages>
				{(Messages) => Button(generator(Messages))(props)}
			</WithMessages>
		);
	};
}

export const DeleteButton = ButtonWithMessages((Messages) => ({
	kind: "danger",
	testId: "delete-button",
	title: Messages.util.delete,
}));
export const CancelButton = ButtonWithMessages((Messages) => ({
	kind: "secondary",
	testId: "cancel-button",
	title: Messages.util.cancel,
}));
export const OkButton = ButtonWithMessages((Messages) => ({
	kind: "primary",
	testId: "ok-button",
	title: Messages.util.ok,
}));

interface OkCancelProps {
	onOk: () => void;
	onCancel: () => void;
	okTitle?: string;
	cancelTitle?: string;
}

export const OkCancel = ({
	onOk,
	okTitle,
	onCancel,
	cancelTitle,
}: OkCancelProps) => (
	<WithMessages>
		{(Messages) => (
			<Space>
				<CancelButton
					onClick={onCancel}
					title={cancelTitle || Messages.util.cancel}
					testId={slugify(cancelTitle || Messages.util.cancel)}
				/>
				<OkButton
					onClick={onOk}
					title={okTitle || Messages.util.ok}
					testId={slugify(okTitle || Messages.util.ok)}
				/>
			</Space>
		)}
	</WithMessages>
);
