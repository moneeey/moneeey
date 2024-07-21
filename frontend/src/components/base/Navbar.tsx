import { compact } from "lodash";
import type { ReactNode } from "react";

import { LinkButton } from "./Button";

import type { WithDataTestId } from "./Common";
import Icon from "./Icon";

interface NavbarItem {
	key: string;
	label: string;
	customLabel?: ReactNode;
	isActive: boolean;
	icon: ReactNode;
	onClick: () => void;
	children?: Array<NavbarItem>;
	visible?: boolean;
}

interface NavbarProps {
	items: Array<NavbarItem>;
	footer: ReactNode;
	className?: string;
}

const renderNavbarItems = (dataTestId: string, items: NavbarItem[]) =>
	items.map((item: NavbarItem): JSX.Element[] => {
		if (item.visible === false) {
			return [];
		}

		return compact([
			<LinkButton
				className={`flex items-center gap-1 !py-0.5 !px-2 no-underline hover:bg-background-900 hover:opacity-75 ${
					item.isActive ? "opacity-75 !bg-background-900 mn-active-navbar" : ""
				}`}
				testId={`${dataTestId}_${item.key}`}
				onClick={item.onClick || (() => ({}))}
				key={item.key}
				title={item.label}
			>
				{item.icon && <Icon>{item.icon}</Icon>} {item.customLabel || item.label}
			</LinkButton>,
			item.children && (
				<div
					key={`subitems_${item.key}`}
					className="flex flex-col pl-4 align-middle"
				>
					{renderNavbarItems(dataTestId, item.children || [])}
				</div>
			),
		]);
	});

const Navbar = (props: NavbarProps & WithDataTestId) => {
	return (
		<nav
			className={`flex flex-col bottom-0 left-0 top-0 pt-2 w-80 bg-background-800 ${
				props.className || ""
			}`}
			data-testid={props.testId}
		>
			{renderNavbarItems(props.testId, props.items)}
			<div className="p-4 self-end">{props.footer}</div>
		</nav>
	);
};

export default Navbar;
