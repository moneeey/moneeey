export type TagVariant = "highlight" | "memo" | "from" | "to";

interface TagProps {
	title: string;
	variant: TagVariant;
	onClick?: () => void;
	onMouseOver?: () => void;
	onMouseOut?: () => void;
}

const variantClass: Record<TagVariant, string> = {
	highlight: "bg-tag-highlight",
	memo: "bg-tag-memo",
	from: "bg-tag-from",
	to: "bg-tag-to",
};

const Tag = ({
	title,
	variant,
	onClick,
	onMouseOver,
	onMouseOut,
}: TagProps) => {
	const interactive = Boolean(onClick);
	return (
		<span
			className={`m-0 mr-1 inline-block px-1 text-xs leading-tight align-middle rounded-sm text-tag-fg ${variantClass[variant]} ${interactive ? "cursor-pointer hover:opacity-75" : ""}`}
			role={interactive ? "button" : undefined}
			tabIndex={interactive ? 0 : undefined}
			onClick={onClick}
			onMouseOver={onMouseOver}
			onMouseOut={onMouseOut}
			onFocus={onMouseOver}
			onBlur={onMouseOut}
			onKeyDown={
				interactive
					? (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onClick?.();
							}
						}
					: undefined
			}
			title={title}
		>
			{title}
		</span>
	);
};

export default Tag;
