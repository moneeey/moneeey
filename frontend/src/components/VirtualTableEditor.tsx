import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
	type ComponentType,
	type Dispatch,
	type KeyboardEvent,
	type Ref,
	type SetStateAction,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import {
	FixedSizeList as GenericFixedSizeList,
	type FixedSizeListProps,
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

const FixedSizeList =
	GenericFixedSizeList as unknown as ComponentType<FixedSizeListProps>;

const SCROLLBAR_WIDTH = 24;
// Fallback until the first DOM measurement resolves.
const ROW_LINE_HEIGHT_FALLBACK = 24;
const COMPACT_HEADER_VERTICAL_PADDING = 8;

const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(" ");

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

const isActivationKey = (event: KeyboardEvent) =>
	event.key === "Enter" || event.key === " ";

// Shared sortable header cell used by both desktop and compact headers.
// Clicking (or pressing Enter/Space) toggles ascend/descend on the active
// column or switches to a new column in ascend order.
const SortableHeaderText = ({
	column,
	sort,
	setSort,
	className,
	style,
	children,
}: {
	column: ColumnDef;
	sort: SortColumn;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	className?: string;
	style?: React.CSSProperties;
	children: ReactNode;
}) => {
	const isSorted = sort.column.sorter === column.sorter;
	const toggle = () =>
		setSort(
			isSorted
				? { column, order: sort.order === "ascend" ? "descend" : "ascend" }
				: { column, order: "ascend" },
		);
	return (
		<span
			role="button"
			tabIndex={0}
			className={cn("cursor-pointer select-none", className)}
			style={style}
			onClick={toggle}
			onKeyDown={(event) => {
				if (isActivationKey(event)) {
					event.preventDefault();
					toggle();
				}
			}}
		>
			{children} {isSorted && <SortIcon order={sort.order} />}
		</span>
	);
};

type ScrollData = {
	scrollLeft: number;
	scrollTop: number;
};

const VirtualGrid = ({
	outerRef,
	className,
	gridHeight,
	rowHeight,
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
	rowHeight: number;
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
		rowHeight={() => rowHeight}
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

const HeaderCell = ({ column, style, sort, setSort }: GridRenderCell) => (
	<SortableHeaderText
		column={column}
		sort={sort}
		setSort={setSort}
		className="font-semibold"
		style={style}
	>
		{column.title}
	</SortableHeaderText>
);

const ContentCell = observer(
	({ rowIndex, row, column, style }: GridRenderCell) => {
		const Renderer = column.render;

		const bgColor =
			rowIndex % 2 === 0 ? "bg-background-800" : "bg-background-600";
		const columnClass = column.customClass
			? column.customClass(row, rowIndex)
			: "";
		const clzz = cn(bgColor, columnClass);
		return row ? (
			<div
				key={`${clzz}_${row.entityId}`}
				data-testid="rowCell"
				data-row-index={rowIndex}
				style={style}
				className={clzz}
			>
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
	rowHeight,
	columns,
	rows,
	setSort,
	sort,
}: {
	width: number;
	height: number;
	rowHeight: number;
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
		rowHeight,
		columns: calculatedColumns,
	};

	return (
		<>
			<VirtualGrid
				className={`!overflow-hidden bg-background-700 px-2 ${testId}-header`}
				gridHeight={rowHeight}
				outerRef={headerRef}
				{...common}
				rows={[{ entityId: "Header" }]}
				RenderCell={HeaderCell}
			/>
			<VirtualGrid
				className={`bg-background-800 px-2 pb-2 ${testId}-body`}
				gridHeight={height - rowHeight}
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
	testId,
}: {
	line: CompactCell[];
	row: Row;
	rowIndex: number;
	columnsByTitle: Map<string, ColumnDef>;
	testId?: string;
}) => (
	<div
		data-testid={testId ? `${testId}-compactLine` : "compactLine"}
		className="flex items-center gap-2 leading-tight"
	>
		{line.map((rawCell, cellIdx) => {
			const cell = asCompactCellObject(rawCell);
			const column = columnsByTitle.get(cell.title);
			if (!column) return null;
			const Renderer = column.render;
			const columnClass = column.customClass
				? column.customClass(row, rowIndex)
				: "";
			const alignClass =
				cell.align === "right" && "text-right [&_input]:text-right";
			const mutedClass = cell.muted && "text-xs text-muted-foreground";
			const flexValue = cell.flex ?? 1;
			return (
				<div
					key={`${cell.title}_${cellIdx}`}
					style={{ flex: flexValue, minWidth: 0 }}
					className={cn(alignClass, mutedClass, columnClass, cell.className)}
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
		testId,
	}: {
		row: Row | undefined;
		rowIndex: number;
		style: object;
		compactLayout: CompactLayout;
		columnsByTitle: Map<string, ColumnDef>;
		testId?: string;
	}) => {
		if (!row) return <div style={style} />;
		const bgColor =
			rowIndex % 2 === 0 ? "bg-background-800" : "bg-background-600";
		return (
			<div
				style={style}
				data-testid={testId ? `${testId}-compactRow` : "compactRow"}
				className={`${bgColor} flex flex-col justify-center gap-0.5 border-b border-background-700 px-2`}
			>
				{compactLayout.map((line, lineIdx) => (
					<CompactRowLine
						key={`line_${lineIdx}_${row.entityId}`}
						line={line}
						row={row}
						rowIndex={rowIndex}
						columnsByTitle={columnsByTitle}
						testId={testId}
					/>
				))}
			</div>
		);
	},
);

const CompactHeaderLine = ({
	line,
	lineHeight,
	columnsByTitle,
	sort,
	setSort,
}: {
	line: CompactCell[];
	lineHeight: number;
	columnsByTitle: Map<string, ColumnDef>;
	sort: SortColumn;
	setSort: Dispatch<SetStateAction<SortColumn>>;
}) => (
	<div
		className="flex items-center gap-2"
		style={{ height: lineHeight }}
	>
		{line.map((rawCell, cellIdx) => {
			const cell = asCompactCellObject(rawCell);
			const column = columnsByTitle.get(cell.title);
			if (!column) return null;
			const flex = cell.flex ?? 1;
			const align = cell.align === "right" && "text-right";
			return (
				<SortableHeaderText
					key={`${cell.title}_${cellIdx}`}
					column={column}
					sort={sort}
					setSort={setSort}
					className={cn("truncate text-xs font-semibold", align)}
					style={{ flex, minWidth: 0 }}
				>
					{cell.title}
				</SortableHeaderText>
			);
		})}
	</div>
);

// Hidden line-rendering ruler: measures the actual rendered height of a text
// row under the current font size, so both desktop ROW_HEIGHT and compact
// per-line height adapt when the user zooms or the OS font scale changes.
// The ruler contains both a normal-size and a text-xs span so its height
// matches the tallest line any layout can produce.
const RowLineRuler = ({
	onMeasure,
}: {
	onMeasure: (height: number) => void;
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const node = ref.current;
		if (!node) return;
		const measure = () => {
			const h = node.getBoundingClientRect().height;
			if (h > 0) onMeasure(h);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [onMeasure]);

	return (
		<div
			ref={ref}
			aria-hidden="true"
			className="pointer-events-none invisible absolute flex items-center gap-2 leading-tight"
			style={{ left: -9999, top: -9999 }}
		>
			<span className="text-xs">Mp</span>
			<span>Mp</span>
		</div>
	);
};

const CompactVirtualTableGrid = ({
	testId,
	width,
	height,
	rows,
	lineHeight,
	rowHeight,
	compactLayout,
	sort,
	setSort,
	columns,
}: {
	width: number;
	height: number;
	rows: Row[];
	lineHeight: number;
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
		compactLayout.length * lineHeight + COMPACT_HEADER_VERTICAL_PADDING;

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
						lineHeight={lineHeight}
						columnsByTitle={columnsByTitle}
						sort={sort}
						setSort={setSort}
					/>
				))}
			</div>
			<FixedSizeList
				className={`bg-background-800 pb-2 ${testId}-body`}
				height={height - headerHeight}
				width={width}
				itemCount={rows.length}
				itemSize={rowHeight}
				itemKey={(index) => rows[index]?.entityId ?? String(index)}
			>
				{({ index, style }) => (
					<CompactContentCell
						row={rows[index]}
						rowIndex={index}
						style={style}
						compactLayout={compactLayout}
						columnsByTitle={columnsByTitle}
						testId={testId}
					/>
				)}
			</FixedSizeList>
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

	const [lineHeight, setLineHeight] = useState(ROW_LINE_HEIGHT_FALLBACK);

	const compactRowHeight = Math.ceil(
		resolvedCompactLayout.length * lineHeight +
			(resolvedCompactLayout.length - 1) * 2, // gap-0.5 ≈ 2px between lines
	);

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
		<>
			<RowLineRuler onMeasure={setLineHeight} />
			<AutoSizer>
				{({ width, height }: { width: number; height: number }) =>
					isCompact ? (
						<CompactVirtualTableGrid
							key={`compact_${width}_${height}`}
							testId={testId}
							width={width}
							height={height}
							rows={sortedRows}
							lineHeight={lineHeight}
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
							rowHeight={lineHeight}
							columns={desktopColumns}
							rows={sortedRows}
							setSort={setSort}
							sort={sort}
						/>
					)
				}
			</AutoSizer>
		</>
	);
};

export default VirtualTable;
