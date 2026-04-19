import { XMarkIcon } from "@heroicons/react/24/outline";
import { type ReactNode, useState } from "react";

import Icon from "./base/Icon";

export type StatusType = "warning" | "success" | "info" | "error";

export interface StatusProps {
	type: StatusType;
	children: string | ReactNode | ReactNode[];
	onDismiss?: () => void;
}

const styles: Record<StatusType, string> = {
	success: "bg-notif-success-bg text-notif-success-fg",
	info: "bg-notif-info-bg text-notif-info-fg",
	warning: "bg-notif-warning-bg text-notif-warning-fg",
	error: "bg-notif-error-bg text-notif-error-fg",
};

export const Status = ({ type, children, onDismiss }: StatusProps) => {
	const [dismissed, setDismiss] = useState(false);

	const doDismiss = () => {
		setDismiss(true);
		if (onDismiss) {
			onDismiss();
		}
	};

	return dismissed ? null : (
		<div
			className={`mb-2 rounded-lg p-2 text-sm ${styles[type]} flex flex-row`}
			onClick={doDismiss}
			onKeyDown={doDismiss}
			data-testid={`mn-status-${type}`}
		>
			<div className="grow">{children}</div>
			<Icon testId="mn-dismiss-status">
				<XMarkIcon />
			</Icon>
		</div>
	);
};
