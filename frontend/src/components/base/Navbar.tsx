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
	expanded: boolean;
}

const NavbarItems = ({
	items,
	testId,
	expanded,
}: { items: NavbarItem[]; expanded: boolean } & WithDataTestId) =>
	items.map((item: NavbarItem): JSX.Element[] => {
		if (item.visible === false) {
			return [];
		}

		return compact([
			<LinkButton
				className={`flex items-center gap-1 !py-0.5 !px-2 no-underline hover:bg-background-900 hover:opacity-75 h-6 ${
					item.isActive ? "opacity-75 !bg-background-900 mn-active-navbar" : ""
				}`}
				testId={`${testId}_${item.key}`}
				onClick={item.onClick || (() => ({}))}
				key={item.key}
				title={item.label}
			>
				{item.icon && <Icon>{item.icon}</Icon>}{" "}
				{expanded ? item.customLabel || item.label : ""}
			</LinkButton>,
			item.children && (
				<div
					key={`subitems_${item.key}`}
					className="flex flex-col pl-2 align-middle"
				>
					<NavbarItems
						testId={`${testId}_subitems_${item.key}`}
						items={item.children}
						expanded={expanded}
					/>
				</div>
			),
		]);
	});

const Navbar = (props: NavbarProps & WithDataTestId) => {
	return (
		<nav
			className={`flex flex-col bottom-0 left-0 top-0 pt-2 bg-background-800 ${
				props.className || ""
			}`}
			data-testid={props.testId}
		>
			<NavbarItems
				testId={props.testId}
				items={props.items}
				expanded={props.expanded}
			/>
			<div className="p-4 self-end">{props.footer}</div>
		</nav>
	);
};

export default Navbar;
