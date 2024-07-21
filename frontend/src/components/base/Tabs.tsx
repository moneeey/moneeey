import { type ReactNode, useState } from "react";

import { type StorageKind, getStorage, setStorage } from "../../utils/Utils";

import { LinkButton } from "./Button";
import type { WithDataTestId } from "./Common";
import Space from "./Space";
import { HeaderContent } from "../AppMenu";

interface TabItem {
	key: string;
	label: string | ReactNode;
	children?: ReactNode | ReactNode[];
}

interface TabsProps {
	className?: string;
	displayOnHeader?: boolean;
	items: Array<TabItem>;
	persist?: StorageKind;
	onChange?: (selectedIdx: number) => void;
}

const Tabs = (props: TabsProps & WithDataTestId) => {
	const key = `Tabs_${props.testId}`;
	const [selectedIdx, setSelectedIdx] = useState(
		props.persist
			? Number.parseInt(getStorage(key, "0", props.persist), 10)
			: 0,
	);
	const onChange = (newIdx: number) => {
		setSelectedIdx(newIdx);
		if (props.persist) {
			setStorage(key, `${newIdx}`, props.persist);
		}
		if (props.onChange) {
			props.onChange(newIdx);
		}
	};

	const activeTab = Math.min(props.items.length - 1, selectedIdx);
	const links = (
		<nav data-testid={props.testId}>
			<Space
				className={`no-scrollbar flex-wrap mb-2 max-w-max ${
					props.displayOnHeader ? "" : "border-b border-b-background-300"
				}`}
			>
				{props.items.map((item, idx) => (
					<LinkButton
						key={item.key}
						onClick={() => onChange(idx)}
						testId={`${props.testId}_${item.key}`}
						className={idx === activeTab ? "underline" : ""}
					>
						{item.label}
					</LinkButton>
				))}
			</Space>
		</nav>
	);

	return (
		<section className={`flex grow flex-col p-2 ${props.className || ""}`}>
			{props.displayOnHeader ? <HeaderContent>{links}</HeaderContent> : links}
			{props.items[activeTab]?.children}
		</section>
	);
};

export default Tabs;
