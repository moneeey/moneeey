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
	success: "bg-success-300 text-success-900",
	info: "bg-info-300 text-info-900",
	warning: "bg-warning-300 text-warning-900",
	error: "bg-error-300 text-error-900",
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
