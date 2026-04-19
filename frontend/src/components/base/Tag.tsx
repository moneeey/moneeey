interface TagProps {
	title: string;
	color?: string;
	onClick?: () => void;
	onMouseOver?: () => void;
	onMouseOut?: () => void;
}

const contrastColor = (hexcolor: string) => {
	const r = Number.parseInt(hexcolor.substring(0, 2), 16);
	const g = Number.parseInt(hexcolor.substring(2, 4), 16);
	const b = Number.parseInt(hexcolor.substring(4, 6), 16);
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;

	return yiq >= 128 ? "black" : "white";
};

const Tag = ({ title, color, onClick, onMouseOver, onMouseOut }: TagProps) => {
	const interactive = Boolean(onClick);
	return (
		<span
			className={`m-0 mr-1 p-1 ${interactive ? "cursor-pointer hover:opacity-75" : ""}`}
			role={interactive ? "button" : undefined}
			tabIndex={interactive ? 0 : undefined}
			onClick={onClick}
			onMouseOver={onMouseOver}
			onMouseOut={onMouseOut}
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
			style={{
				backgroundColor: color,
				color: contrastColor(color || "#000000"),
				borderColor: color,
			}}
		>
			{title}
		</span>
	);
};

export default Tag;
