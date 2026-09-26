import { XMarkIcon } from "@heroicons/react/24/outline";
import { observer } from "mobx-react-lite";
import { type ReactElement, type ReactNode, useCallback } from "react";

import type { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import Card from "./Card";
import Icon from "./Icon";
import MinimalBasicScreen from "./MinimalBaseScreen";
import { TextTitle } from "./Text";

interface ModalProps {
	fullScreen?: boolean;
	title: string;
	footer?: ReactNode;
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
		fullScreen,
	}: ModalProps) => {
		const { navigation } = useMoneeeyStore();

		const onCloseFn = useCallback(() => {
			if (onClose) {
				onClose();
			} else {
				navigation.closeModal();
			}
		}, [onClose, navigation]);

		const visible =
			isOpen === true || (modalId && navigation.modal === modalId);

		if (!visible) return null;

		const Content = () => (
			<Card
				header={
					<div className="flex items-center justify-between pb-2 border-b border-background-700/50">
						<TextTitle
							testId="nm-modal-title"
							className="text-lg font-semibold"
						>
							{title}
						</TextTitle>
						<button
							type="button"
							aria-label="Close modal"
							className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-background-700/50 transition-colors"
							onClick={onCloseFn}
						>
							<Icon size="md">
								<XMarkIcon className="w-5 h-5" />
							</Icon>
						</button>
					</div>
				}
				testId="nm-modal-card"
				footer={footer}
				variant="elevated"
				padding="md"
			>
				<div className="pt-2">{children}</div>
			</Card>
		);

		if (!fullScreen) {
			return (
				<article
					className={`fixed bottom-4 left-4 right-4 md:right-auto md:left-24 md:bottom-6 z-50 max-w-lg shadow-2xl animate-fade-in-up ${
						className || ""
					}`}
				>
					<Content />
				</article>
			);
		}

		return (
			<article
				className={`fixed inset-0 z-50 bg-background-900 overflow-y-auto ${
					className || ""
				}`}
			>
				<MinimalBasicScreen>
					<div className="w-full text-left">
						<Content />
					</div>
				</MinimalBasicScreen>
			</article>
		);
	},
);

export default Modal;
