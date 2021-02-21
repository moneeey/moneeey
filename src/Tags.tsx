import { Tag } from "antd";
import React from "react";
import { useMoneeeyStore } from "./MoneeeyStore";
import { NavigationArea } from "./Navigation";

const TagColors: { [_group: string]: string } = {
  highlight: "lightsalmon",
  memo: "goldenrod",
  from: "mediumturquoise",
  to: "geekblue",
};

const HighlightTagContext = React.createContext({
  tag: "",
  setTag: (_tag: string) => {},
});

interface ITagsProp {
  tags: string[];
}

interface IStyledTagsProp extends ITagsProp {
  color: string;
}

function TagsRenderer({ color, tags }: IStyledTagsProp) {
  const { tag, setTag } = React.useContext(HighlightTagContext);
  const moneeeyStore = useMoneeeyStore();
  return (
    <span>
      {tags.map((t: string) => (
        <Tag
          key={t}
          color={TagColors[tag === t ? "highlight" : color]}
          onMouseOver={() => setTag(t)}
          onMouseOut={() => setTag("")}
          onClick={() =>
            moneeeyStore.navigation.navigate(NavigationArea.TagTransactions, t)
          }
        >
          #{t}
        </Tag>
      ))}
    </span>
  );
}

export function TagsMemo({ tags }: ITagsProp) {
  return <TagsRenderer color={"memo"} tags={tags} />;
}
export function TagsFromAcct({ tags }: ITagsProp) {
  return <TagsRenderer color={"from"} tags={tags} />;
}
export function TagsToAcct({ tags }: ITagsProp) {
  return <TagsRenderer color={"to"} tags={tags} />;
}

export function TagsHighlightProvider({ children }: any) {
  const [tag, setTag] = React.useState("");
  return (
    <HighlightTagContext.Provider value={{ tag, setTag }}>
      {children}
    </HighlightTagContext.Provider>
  );
}
