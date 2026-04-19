import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
	type ComponentType,
	type Dispatch,
	type Ref,
	type SetStateAction,
	useMemo,
	useRef,
	useState,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import {
	VariableSizeGrid as GenericVirtualizedGrid,
	type VariableSizeGridProps,
} from "react-window";

import { observer } from "mobx-react-lite";
import useMessages from "../utils/Messages";
import useTableDensity from "../utils/useTableDensity";
import type { WithDataTestId } from "./base/Common";
import Icon from "./base/Icon";
import Select from "./base/Select";

const VirtualizedGrid =
	GenericVirtualizedGrid as unknown as ComponentType<VariableSizeGridProps>;

const SCROLLBAR_WIDTH = 24;
const ROW_HEIGHT = 24;
const COMPACT_ROW_HEIGHT = 80;
const COMPACT_HEADER_HEIGHT = 40;

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
	compactRender?: (row: Row) => JSX.Element;
	compactRowHeight?: number;
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
	outerRef,
	className,
	gridHeight,
	width,
	rows,
	columns,
	sort,
	setSort,
	setScroll,
	RenderCell,
}: {
	outerRef?: Ref<HTMLDivElement>;
	className: string;
	gridHeight: number;
	width: number;
	rows: Row[];
	columns: ColumnDef[];
	setScroll?: (scrollData: ScrollData) => void;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	RenderCell: (props: GridRenderCell) => JSX.Element;
}) => (
	<VirtualizedGrid
		className={className}
		height={gridHeight}
		width={width}
		rowCount={rows.length}
		columnCount={columns.length}
		rowHeight={() => ROW_HEIGHT}
		columnWidth={(index: number) => columns[index].width}
		outerRef={outerRef}
		onScroll={({ scrollLeft, scrollTop }) =>
			setScroll?.({ scrollLeft, scrollTop })
		}
		itemKey={({ columnIndex, rowIndex }) => `${rowIndex}-${columnIndex}`}
	>
		{({ columnIndex, rowIndex, style }) => (
			<RenderCell
				style={style}
				column={columns[columnIndex]}
				rowIndex={rowIndex}
				row={rows[rowIndex]}
				sort={sort}
				setSort={setSort}
			/>
		)}
	</VirtualizedGrid>
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
			<div key={`${clzz}_${row.entityId}`} style={style} className={clzz}>
				<Renderer entityId={row.entityId} />
			</div>
		) : (
			<div style={style} />
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
	const headerRef = useRef<HTMLDivElement>(null);
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
				outerRef={headerRef}
				{...common}
				rows={[{ entityId: "Header" }]}
				RenderCell={HeaderCell}
			/>
			<VirtualGrid
				className={`bg-background-800 px-2 pb-2 ${testId}-body`}
				gridHeight={height - ROW_HEIGHT}
				{...common}
				setScroll={({ scrollLeft }) => {
					headerRef?.current?.scrollTo(scrollLeft, 0);
				}}
				rows={rows}
				RenderCell={ContentCell}
			/>
		</>
	);
};

const CompactContentCell = observer(
	({
		row,
		rowIndex,
		style,
		compactRender,
	}: {
		row: Row | undefined;
		rowIndex: number;
		style: object;
		compactRender: (row: Row) => JSX.Element;
	}) => {
		if (!row) return <div style={style} />;
		const bgColor =
			rowIndex % 2 === 0 ? "bg-background-800" : "bg-background-600";
		return (
			<div
				style={style}
				className={`${bgColor} border-b border-background-700 px-2`}
			>
				{compactRender(row)}
			</div>
		);
	},
);

const CompactVirtualTableGrid = ({
	testId,
	width,
	height,
	rows,
	rowHeight,
	compactRender,
	sort,
	setSort,
	columns,
}: {
	width: number;
	height: number;
	rows: Row[];
	rowHeight: number;
	compactRender: (row: Row) => JSX.Element;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	columns: ColumnDef[];
} & WithDataTestId) => {
	const Messages = useMessages();
	const sortableColumns = useMemo(
		() => columns.filter((col) => col.sorter),
		[columns],
	);

	const sortOptions = sortableColumns.flatMap((col) => [
		{ label: `${col.title} ↑`, value: `${col.index}:ascend` },
		{ label: `${col.title} ↓`, value: `${col.index}:descend` },
	]);

	const sortValue = `${sort.column.index}:${sort.order}`;

	return (
		<>
			<div
				className={`flex items-center gap-2 bg-background-700 px-2 ${testId}-header`}
				style={{ height: COMPACT_HEADER_HEIGHT }}
			>
				<Select
					testId={`${testId}-sort`}
					placeholder={Messages.settings.sort_by}
					value={sortValue}
					options={sortOptions}
					onChange={(value) => {
						const [rawIndex, rawOrder] = value.split(":");
						const nextIndex = Number(rawIndex);
						if (Number.isNaN(nextIndex)) return;
						const nextColumn = columns.find((col) => col.index === nextIndex);
						if (!nextColumn) return;
						setSort({
							column: nextColumn,
							order: rawOrder === "descend" ? "descend" : "ascend",
						});
					}}
				/>
			</div>
			<VirtualizedGrid
				className={`bg-background-800 pb-2 ${testId}-body`}
				height={height - COMPACT_HEADER_HEIGHT}
				width={width}
				rowCount={rows.length}
				columnCount={1}
				rowHeight={() => rowHeight}
				columnWidth={() => width}
				itemKey={({ rowIndex }) => `${rows[rowIndex]?.entityId ?? rowIndex}`}
			>
				{({ rowIndex, style }) => (
					<CompactContentCell
						row={rows[rowIndex]}
						rowIndex={rowIndex}
						style={style}
						compactRender={compactRender}
					/>
				)}
			</VirtualizedGrid>
		</>
	);
};

const VirtualTable = function VirtualTableRenderer({
	columns,
	rows,
	testId,
	isNewEntity,
	compactRender,
	compactRowHeight = COMPACT_ROW_HEIGHT,
}: VirtualTableProps & WithDataTestId) {
	const density = useTableDensity();
	const isCompact = density === "compact" && Boolean(compactRender);

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
			{({ width, height }: { width: number; height: number }) =>
				isCompact && compactRender ? (
					<CompactVirtualTableGrid
						key={`compact_${width}_${height}`}
						testId={testId}
						width={width}
						height={height}
						rows={sortedRows}
						rowHeight={compactRowHeight}
						compactRender={compactRender}
						sort={sort}
						setSort={setSort}
						columns={columns}
					/>
				) : (
					<VirtualTableGrid
						key={`${width}_${height}`}
						testId={testId}
						width={width}
						height={height}
						columns={columns}
						rows={sortedRows}
						setSort={setSort}
						sort={sort}
					/>
				)
			}
		</AutoSizer>
	);
};

export default VirtualTable;
