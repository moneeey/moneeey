import type { ReactNode } from "react";

import { observer } from "mobx-react-lite";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { LinkButton } from "./Button";
import type { WithDataTestId } from "./Common";

interface TabItem {
	key: string;
	label: string | ReactNode;
	children?: ReactNode | ReactNode[];
}

interface TabsProps {
	items: Array<TabItem>;
}

function useSelectedIndex(props: TabsProps & WithDataTestId) {
	const { navigation } = useMoneeeyStore();
	const selectedIndex = navigation.tabsSelectedIndex.get(props.testId) || 0;
	return {
		current: Math.min(props.items.length - 1, selectedIndex),
		update: (newIndex: number) =>
			navigation.updateTabsSelectedIndex(props.testId, newIndex),
	};
}

export const TabsHeader = observer((props: TabsProps & WithDataTestId) => {
	const { current, update } = useSelectedIndex(props);
	return (
		<nav data-testid={props.testId}>
			<div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-4 md:items-center">
				{props.items.map((item, idx) => (
					<LinkButton
						key={item.key}
						onClick={() => update(idx)}
						testId={`${props.testId}_${item.key}`}
						className={idx === current ? "bg-background-700" : ""}
					>
						{item.label}
					</LinkButton>
				))}
			</div>
		</nav>
	);
});

export const TabsContent = observer((props: TabsProps & WithDataTestId) => {
	const { current } = useSelectedIndex(props);
	return props.items[current]?.children;
});

const Tabs = (props: TabsProps & WithDataTestId) => {
	return (
		<section key={`Tabs_${props.testId}`} className="flex grow flex-col">
			<TabsHeader {...props} />
			<TabsContent {...props} />
		</section>
	);
};

export default Tabs;
