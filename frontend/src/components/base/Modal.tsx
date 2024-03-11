import { XCircleIcon } from "@heroicons/react/24/outline";
import { observer } from "mobx-react";
import type { ReactElement, ReactNode } from "react";

import type { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import Card from "./Card";
import Icon from "./Icon";
import { TextTitle } from "./Text";

interface ModalProps {
	title: string;
	footer: ReactNode;
	onClose?: () => void;
	isOpen?: boolean;
	modalId?: NavigationModal;
	children: ReactElement | ReactElement[];
	className?: string;
}

const Modal = observer(
	({
		title,
		modalId,
		footer,
		onClose,
		isOpen,
		children,
		className,
	}: ModalProps) => {
		const { navigation } = useMoneeeyStore();

		const onCloseFn = () => (onClose && onClose()) || navigation.closeModal();

		const visible =
			isOpen === true || (modalId && navigation.modal === modalId);

		return visible ? (
			<article
				className={`fixed bottom-0 left-0 right-0 z-50 rounded-lg rounded-b-none bg-background-600
      p-4 shadow-xl md:bottom-0 md:left-20 md:right-auto md:top-auto md:mx-auto md:rounded-b-lg ${
				className || ""
			}`}
			>
				<Card
					header={
						<div className="flex justify-between align-middle">
							<TextTitle testId="nm-modal-title" className="m-0">
								{title}
							</TextTitle>
							<Icon className="m-1 mr-4 cursor-pointer hover:opacity-75">
								<XCircleIcon onClick={onCloseFn} />
							</Icon>
						</div>
					}
					testId="nm-modal-card"
					footer={footer}
				>
					{children}
				</Card>
			</article>
		) : (
			<div />
		);
	},
);

export { Modal, Modal as default };
