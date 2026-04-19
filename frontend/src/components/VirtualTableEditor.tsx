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
import type { ReactNode } from "react";
import useTableDensity from "../utils/useTableDensity";
import type { WithDataTestId } from "./base/Common";
import Icon from "./base/Icon";
import { FieldVisibility } from "./editor/FieldDef";

const VirtualizedGrid =
	GenericVirtualizedGrid as unknown as ComponentType<VariableSizeGridProps>;

const SCROLLBAR_WIDTH = 24;
const ROW_HEIGHT = 24;
const COMPACT_ROW_LINE_HEIGHT = 30;
const COMPACT_HEADER_LINE_HEIGHT = 20;
const COMPACT_HEADER_VERTICAL_PADDING = 8;

export type Row = {
	entityId: string;
};

type SortOrder = "descend" | "ascend";

export type ColumnDef = {
	width: number;
	title: string;
	index: number;
	defaultSortOrder?: SortOrder;
	visibility?: FieldVisibility;
	sorter?: (a: Row, b: Row, asc: boolean) => number;
	render: (row: Row) => JSX.Element;
	customClass?: (row: Row, rowIndex: number) => string;
};

export type CompactCellObject = {
	title: string;
	align?: "left" | "right";
	muted?: boolean;
	icon?: ReactNode;
	className?: string;
	flex?: number;
};

export type CompactCell = string | CompactCellObject;

export type CompactLayout = CompactCell[][];

type SortColumn = {
	order: SortOrder;
	column: ColumnDef;
};

type VirtualTableProps = {
	columns: ColumnDef[];
	rows: Row[];
	isNewEntity?: (row: Row) => boolean;
	compactLayout?: CompactLayout;
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

const asCompactCellObject = (cell: CompactCell): CompactCellObject =>
	typeof cell === "string" ? { title: cell } : cell;

const defaultCompactLayout = (columns: ColumnDef[]): CompactLayout =>
	columns
		.filter((col) => col.visibility !== FieldVisibility.OnlyOnDesktop)
		.map((col) => [{ title: col.title }]);

const CompactRowLine = ({
	line,
	row,
	rowIndex,
	columnsByTitle,
}: {
	line: CompactCell[];
	row: Row;
	rowIndex: number;
	columnsByTitle: Map<string, ColumnDef>;
}) => (
	<div data-testid="compactLine" className="flex items-center gap-2 leading-tight">
		{line.map((rawCell, cellIdx) => {
			const cell = asCompactCellObject(rawCell);
			const column = columnsByTitle.get(cell.title);
			if (!column) return null;
			const Renderer = column.render;
			const columnClass = column.customClass
				? column.customClass(row, rowIndex)
				: "";
			const alignClass =
				cell.align === "right" ? "text-right [&_input]:text-right" : "";
			const mutedClass = cell.muted ? "text-xs text-muted-foreground" : "";
			const flexValue = cell.flex ?? 1;
			return (
				<div
					key={`${cell.title}_${cellIdx}`}
					style={{ flex: flexValue, minWidth: 0 }}
					className={`${alignClass} ${mutedClass} ${columnClass} ${cell.className ?? ""}`}
				>
					{cell.icon ? (
						<span className="flex w-full items-center gap-1">
							<span className="shrink-0">{cell.icon}</span>
							<span className="min-w-0 grow">
								<Renderer entityId={row.entityId} />
							</span>
						</span>
					) : (
						<Renderer entityId={row.entityId} />
					)}
				</div>
			);
		})}
	</div>
);

const CompactContentCell = observer(
	({
		row,
		rowIndex,
		style,
		compactLayout,
		columnsByTitle,
	}: {
		row: Row | undefined;
		rowIndex: number;
		style: object;
		compactLayout: CompactLayout;
		columnsByTitle: Map<string, ColumnDef>;
	}) => {
		if (!row) return <div style={style} />;
		const bgColor =
			rowIndex % 2 === 0 ? "bg-background-800" : "bg-background-600";
		return (
			<div
				style={style}
				data-testid="compactRow"
				className={`${bgColor} flex flex-col justify-center gap-0.5 border-b border-background-700 px-2`}
			>
				{compactLayout.map((line, lineIdx) => (
					<CompactRowLine
						key={`line_${lineIdx}_${row.entityId}`}
						line={line}
						row={row}
						rowIndex={rowIndex}
						columnsByTitle={columnsByTitle}
					/>
				))}
			</div>
		);
	},
);

const CompactHeaderLine = ({
	line,
	columnsByTitle,
	sort,
	setSort,
}: {
	line: CompactCell[];
	columnsByTitle: Map<string, ColumnDef>;
	sort: SortColumn;
	setSort: Dispatch<SetStateAction<SortColumn>>;
}) => (
	<div
		className="flex items-center gap-2"
		style={{ height: COMPACT_HEADER_LINE_HEIGHT }}
	>
		{line.map((rawCell, cellIdx) => {
			const cell = asCompactCellObject(rawCell);
			const column = columnsByTitle.get(cell.title);
			if (!column) return null;
			const flex = cell.flex ?? 1;
			const align = cell.align === "right" ? "text-right" : "";
			const isSorted = sort.column.sorter === column.sorter;
			const onClick = () => {
				if (isSorted) {
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
					key={`${cell.title}_${cellIdx}`}
					style={{ flex, minWidth: 0 }}
					onClick={onClick}
					onKeyDown={onClick}
					className={`cursor-pointer select-none truncate text-xs font-semibold ${align}`}
				>
					{cell.title}
					{isSorted && <SortIcon order={sort.order} />}
				</span>
			);
		})}
	</div>
);

const CompactVirtualTableGrid = ({
	testId,
	width,
	height,
	rows,
	rowHeight,
	compactLayout,
	sort,
	setSort,
	columns,
}: {
	width: number;
	height: number;
	rows: Row[];
	rowHeight: number;
	compactLayout: CompactLayout;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	columns: ColumnDef[];
} & WithDataTestId) => {
	const columnsByTitle = useMemo(
		() => new Map(columns.map((col) => [col.title, col])),
		[columns],
	);

	const headerHeight =
		compactLayout.length * COMPACT_HEADER_LINE_HEIGHT +
		COMPACT_HEADER_VERTICAL_PADDING;

	return (
		<>
			<div
				className={`flex flex-col gap-0.5 bg-background-700 px-2 py-1 ${testId}-header`}
				style={{ height: headerHeight, width }}
			>
				{compactLayout.map((line, lineIdx) => (
					<CompactHeaderLine
						key={`headerLine_${line.map((cell) => (typeof cell === "string" ? cell : cell.title)).join("|")}_${lineIdx}`}
						line={line}
						columnsByTitle={columnsByTitle}
						sort={sort}
						setSort={setSort}
					/>
				))}
			</div>
			<VirtualizedGrid
				className={`bg-background-800 pb-2 ${testId}-body`}
				height={height - headerHeight}
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
						compactLayout={compactLayout}
						columnsByTitle={columnsByTitle}
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
	compactLayout,
}: VirtualTableProps & WithDataTestId) {
	const density = useTableDensity();
	const isCompact = density === "compact";

	const desktopColumns = useMemo(
		() =>
			columns.filter((col) => col.visibility !== FieldVisibility.OnlyOnMobile),
		[columns],
	);

	const resolvedCompactLayout = useMemo(
		() => compactLayout ?? defaultCompactLayout(columns),
		[compactLayout, columns],
	);

	const compactRowHeight =
		resolvedCompactLayout.length * COMPACT_ROW_LINE_HEIGHT;

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
				isCompact ? (
					<CompactVirtualTableGrid
						key={`compact_${width}_${height}`}
						testId={testId}
						width={width}
						height={height}
						rows={sortedRows}
						rowHeight={compactRowHeight}
						compactLayout={resolvedCompactLayout}
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
						columns={desktopColumns}
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
