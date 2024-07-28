import type { ReactNode } from "react";

import { observer } from "mobx-react-lite";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { LinkButton } from "./Button";
import type { WithDataTestId } from "./Common";
import Space from "./Space";

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
			<Space className="no-scrollbar flex-wrap m-2 max-w-max">
				{props.items.map((item, idx) => (
					<LinkButton
						key={item.key}
						onClick={() => update(idx)}
						testId={`${props.testId}_${item.key}`}
						className={idx === current ? "!bg-background-400" : ""}
					>
						{item.label}
					</LinkButton>
				))}
			</Space>
		</nav>
	);
});

export const TabsContent = observer((props: TabsProps & WithDataTestId) => {
	const { current } = useSelectedIndex(props);
	return props.items[current]?.children;
});

const Tabs = (props: TabsProps & WithDataTestId) => {
	return (
		<section key={`Tabs_${props.testId}`} className="flex grow flex-col p-2">
			<TabsHeader {...props} />
			<TabsContent {...props} />
		</section>
	);
};

export default Tabs;
