import { ChevronRightIcon } from "@heroicons/react/24/outline";
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
	onCollapse?: () => void;
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
				compact
				className={`relative flex items-center gap-1 py-0.5 px-2 no-underline hover:bg-background-900 hover:opacity-75 h-6 ${
					item.isActive ? "opacity-75 bg-background-900 mn-active-navbar" : ""
				}`}
				testId={`${testId}_${item.key}`}
				onClick={item.onClick || (() => ({}))}
				key={item.key}
				title={item.label}
			>
				{expanded && item.children && item.children.length > 0 && (
					<Icon size="sm" className="absolute -left-1">
						<ChevronRightIcon />
					</Icon>
				)}
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
		<>
			{props.expanded && (
				<button
					type="button"
					aria-label="Close menu"
					className="md:hidden fixed inset-0 z-30 bg-black/50"
					onClick={props.onCollapse}
				/>
			)}
			<nav
				className={`flex flex-col bottom-0 left-0 top-12 md:top-0 pt-2 bg-background-800 transition-transform duration-200 w-72 md:w-auto fixed z-40 md:static md:translate-x-0 ${
					props.expanded ? "translate-x-0" : "-translate-x-full md:translate-x-0"
				} ${props.className || ""}`}
				data-testid={props.testId}
			>
				<div className="flex flex-col grow">
					<NavbarItems
						testId={props.testId}
						items={props.items}
						expanded={props.expanded}
					/>
				</div>
				<div className="flex flex-col pb-4">{props.footer}</div>
			</nav>
		</>
	);
};

export default Navbar;
