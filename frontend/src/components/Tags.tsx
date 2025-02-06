import React, { type ReactNode } from "react";

import useMoneeeyStore from "../shared/useMoneeeyStore";
import { identity } from "../utils/Utils";

import Tag from "./base/Tag";

const TagColors: { [_group: string]: string } = {
	highlight: "lightblue",
	memo: "goldenrod",
	from: "mediumturquoise",
	to: "geekblue",
};

const HighlightTagContext = React.createContext({
	tag: "",
	setTag: (value: string) => identity(value),
});

interface ITagsProp {
	tags: string[];
}

interface IStyledTagsProp extends ITagsProp {
	color: string;
}

const TagsRenderer = ({ color, tags }: IStyledTagsProp) => {
	const { tag, setTag } = React.useContext(HighlightTagContext);
	if (!setTag) {
		throw new Error("Missing HighlightTagContext");
	}
	const moneeeyStore = useMoneeeyStore();

	return (
		<span>
			{tags.map((t: string) => {
				return (
					<Tag
						key={t}
						color={TagColors[tag === t ? "highlight" : color]}
						onMouseOver={() => setTag(t)}
						onMouseOut={() => setTag("")}
						title={t}
						onClick={(e) => {
							e.preventDefault();
              moneeeyStore.navigation.globalSearchToggleTags([t])
						}}
					/>
				);
			})}
		</span>
	);
};

const TagsMemo = ({ tags }: ITagsProp) => (
	<TagsRenderer color={"memo"} tags={tags} />
);
const TagsFrom = ({ tags }: ITagsProp) => (
	<TagsRenderer color={"from"} tags={tags} />
);
const TagsTo = ({ tags }: ITagsProp) => (
	<TagsRenderer color={"to"} tags={tags} />
);

const TagsHighlightProvider = ({ children }: { children: ReactNode }) => {
	const [tag, setTag] = React.useState("");

	return (
		<HighlightTagContext.Provider value={{ tag, setTag }}>
			{children}
		</HighlightTagContext.Provider>
	);
};

export { TagsMemo, TagsFrom, TagsTo, TagsHighlightProvider };
