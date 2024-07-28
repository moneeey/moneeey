import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer";
import VirtualizedGrid from "react-virtualized/dist/commonjs/Grid";

import { observer } from "mobx-react-lite";
import type { WithDataTestId } from "./base/Common";
import Icon from "./base/Icon";

const SCROLLBAR_WIDTH = 24;
const ROW_HEIGHT = 24;

export type Row = {
	entityId: string;
};

type SortOrder = "descend" | "ascend";

export type ColumnDef = {
	width: number;
	title: string;
	index: number;
	defaultSortOrder?: SortOrder;
	sorter?: (a: Row, b: Row, asc: boolean) => number;
	render: (row: Row) => JSX.Element;
	customClass?: (row: Row, rowIndex: number) => string;
};

type SortColumn = {
	order: SortOrder;
	column: ColumnDef;
};

type VirtualTableProps = {
	columns: ColumnDef[];
	rows: Row[];
	isNewEntity?: (row: Row) => boolean;
};

type GridRenderCell = {
	rowIndex: number;
	column: ColumnDef;
	row: Row;
	style: object;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
};

const SortIcon = ({ order }: { order?: "descend" | "ascend" }) => {
	if (order === "ascend") {
		return (
			<Icon className="inline-block">
				<ChevronUpIcon className="icon-small" />
			</Icon>
		);
	}
	if (order === "descend") {
		return (
			<Icon className="inline-block">
				<ChevronDownIcon className="icon-small" />
			</Icon>
		);
	}

	return <span />;
};

type ScrollData = {
	scrollLeft: number;
	scrollTop: number;
};

const VirtualGrid = ({
	className,
	gridHeight,
	width,
	rows,
	columns,
	sort,
	setSort,
	scroll,
	setScroll,
	RenderCell,
}: {
	className: string;
	gridHeight: number;
	width: number;
	rows: Row[];
	columns: ColumnDef[];
	setScroll: Dispatch<SetStateAction<ScrollData>>;
	scroll: ScrollData;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	RenderCell: (props: GridRenderCell) => JSX.Element;
}) => (
	<VirtualizedGrid
		className={className}
		height={gridHeight}
		width={width}
		rowCount={rows.length}
		rowHeight={ROW_HEIGHT}
		columnWidth={({ index }) => columns[index].width}
		columnCount={columns.length}
		onScroll={({ scrollLeft, scrollTop }) =>
			setScroll({ scrollLeft, scrollTop })
		}
		scrollLeft={scroll.scrollLeft}
		scrollTop={scroll.scrollTop}
		cellRenderer={({ columnIndex, rowIndex, style, key }) => (
			<RenderCell
				key={key}
				style={style}
				column={columns[columnIndex]}
				rowIndex={rowIndex}
				row={rows[rowIndex]}
				sort={sort}
				setSort={setSort}
			/>
		)}
	/>
);

const HeaderCell = ({ column, style, sort, setSort }: GridRenderCell) => {
	const onClick = () => {
		if (sort.column.sorter === column.sorter) {
			setSort({
				column,
				order: sort.order === "ascend" ? "descend" : "ascend",
			});
		} else {
			setSort({ column, order: "ascend" });
		}
	};

	return (
		<span
			className="font-semibold"
			onClick={onClick}
			onKeyDown={onClick}
			style={style}
		>
			{column.title}{" "}
			{sort.column.sorter === column.sorter && <SortIcon order={sort.order} />}
		</span>
	);
};

const ContentCell = observer(
	({ rowIndex, row, column, style }: GridRenderCell) => {
		const Renderer = column.render;

		const bgColor =
			rowIndex % 2 === 0 ? "bg-background-800" : "bg-background-600";
		const columnClass = column.customClass
			? column.customClass(row, rowIndex)
			: "";
		const clzz = `${bgColor} ${columnClass}`;
		return row ? (
			<span key={`${clzz}_${row.entityId}`} style={style} className={clzz}>
				<Renderer entityId={row.entityId} />
			</span>
		) : (
			<span style={style} />
		);
	},
);

const VirtualTableGrid = ({
	testId,
	width,
	height,
	columns,
	rows,
	setSort,
	sort,
}: {
	width: number;
	height: number;
	columns: ColumnDef[];
	rows: Row[];
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
} & WithDataTestId) => {
	const [scroll, setScroll] = useState({
		scrollTop: 0,
		scrollLeft: 0,
	} as ScrollData);
	const calculatedColumns = useMemo(() => {
		const totalWidth = columns.reduce((total, cur) => total + cur.width, 0);

		return columns.map((col) => ({
			...col,
			width:
				Math.max(col.width, Math.floor(width * (col.width / totalWidth))) -
				SCROLLBAR_WIDTH / columns.length,
		}));
	}, [columns, width]);

	const common = {
		scroll,
		setScroll,
		sort,
		setSort,
		width,
		columns: calculatedColumns,
	};

	return (
		<>
			<VirtualGrid
				className={`!overflow-hidden bg-background-700 px-2 ${testId}-header`}
				gridHeight={ROW_HEIGHT}
				{...common}
				scroll={{ scrollTop: 0, scrollLeft: scroll.scrollLeft }}
				setScroll={() => {
					// Do nothing
				}}
				rows={[{ entityId: "Header" }]}
				RenderCell={HeaderCell}
			/>
			<VirtualGrid
				className={`bg-background-800 px-2 pb-2 ${testId}-body`}
				gridHeight={height - ROW_HEIGHT}
				{...common}
				rows={rows}
				RenderCell={ContentCell}
			/>
		</>
	);
};

const VirtualTable = function VirtualTableRenderer({
	columns,
	rows,
	testId,
	isNewEntity,
}: VirtualTableProps & WithDataTestId) {
	const [sort, setSort] = useState(() => {
		const column =
			columns.find((col) => Boolean(col.defaultSortOrder)) || columns[0];

		return { column, order: column.defaultSortOrder || "ascend" };
	});

	const sortedRows = useMemo(
		() =>
			rows.sort((a: Row, b: Row) => {
				if (isNewEntity?.(a)) {
					return +1;
				}
				if (isNewEntity?.(b)) {
					return -1;
				}
				const sortFn = sort.column.sorter || (() => 0);

				return sortFn(a, b, sort.order === "ascend");
			}),
		[rows, sort, isNewEntity],
	);

	return (
		<AutoSizer>
			{({ width, height }: { width: number; height: number }) => (
				<VirtualTableGrid
					testId={testId}
					width={width}
					height={height}
					columns={columns}
					rows={sortedRows}
					setSort={setSort}
					sort={sort}
				/>
			)}
		</AutoSizer>
	);
};

export default VirtualTable;
