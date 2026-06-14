import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
	type CSSProperties,
	type Dispatch,
	type KeyboardEvent,
	type Ref,
	type SetStateAction,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type CellComponentProps,
	List as FixedSizeList,
	type GridImperativeAPI,
	type RowComponentProps,
	Grid as VirtualizedGrid,
} from "react-window";

import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import useTableDensity from "../utils/useTableDensity";
import type { WithDataTestId } from "./base/Common";
import Icon from "./base/Icon";
import { Input } from "./base/Input";
import { FieldVisibility } from "./editor/FieldDef";

const SCROLLBAR_WIDTH = 24;
const OVERSCAN_ROW_COUNT = 10;
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
	style: CSSProperties;
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
};

type VirtualGridCellProps = {
	rows: Row[];
	columns: ColumnDef[];
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	RenderCell: (props: GridRenderCell) => JSX.Element;
};

const VirtualGridCell = ({
	columnIndex,
	rowIndex,
	style,
	rows,
	columns,
	sort,
	setSort,
	RenderCell,
}: CellComponentProps<VirtualGridCellProps>) => (
	<RenderCell
		style={style}
		column={columns[columnIndex]}
		rowIndex={rowIndex}
		row={rows[rowIndex]}
		sort={sort}
		setSort={setSort}
	/>
);

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

const VirtualGrid = ({
	gridRef,
	className,
	gridHeight,
	rowHeight,
	width,
	rows,
	columns,
	sort,
	setSort,
	RenderCell,
}: {
	gridRef?: Ref<GridImperativeAPI>;
	className: string;
	gridHeight: number;
	rowHeight: number;
	width: number;
	rows: Row[];
	columns: ColumnDef[];
	setSort: Dispatch<SetStateAction<SortColumn>>;
	sort: SortColumn;
	RenderCell: (props: GridRenderCell) => JSX.Element;
}) => (
	<VirtualizedGrid
		className={className}
		style={{ height: gridHeight, width }}
		rowCount={rows.length}
		columnCount={columns.length}
		rowHeight={rowHeight}
		columnWidth={(index: number) => columns[index].width}
		gridRef={gridRef}
		overscanCount={OVERSCAN_ROW_COUNT}
		cellComponent={VirtualGridCell}
		cellProps={{ rows, columns, sort, setSort, RenderCell }}
	/>
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
	const headerRef = useRef<GridImperativeAPI | null>(null);
	const bodyRef = useRef<GridImperativeAPI | null>(null);
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

	useLayoutEffect(() => {
		const body = bodyRef.current?.element;
		const header = headerRef.current?.element;
		if (!body || !header) return;

		const syncHeaderScroll = () => {
			header.scrollLeft = body.scrollLeft;
		};
		body.addEventListener("scroll", syncHeaderScroll, { passive: true });
		return () => body.removeEventListener("scroll", syncHeaderScroll);
	}, []);

	return (
		<>
			<VirtualGrid
				className={`!overflow-hidden bg-background-700 px-2 ${testId}-header`}
				gridHeight={rowHeight}
				gridRef={headerRef}
				{...common}
				rows={[{ entityId: "Header" }]}
				RenderCell={HeaderCell}
			/>
			<VirtualGrid
				className={`bg-background-800 px-2 pb-2 ${testId}-body`}
				gridHeight={height - rowHeight}
				gridRef={bodyRef}
				{...common}
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
			const mutedClass = cell.muted && "text-muted-foreground";
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
		index,
		style,
		rows,
		compactLayout,
		columnsByTitle,
		testId,
	}: RowComponentProps<{
		rows: Row[];
		compactLayout: CompactLayout;
		columnsByTitle: Map<string, ColumnDef>;
		testId?: string;
	}>) => {
		const row = rows[index];
		if (!row) return <div style={style} />;
		const bgColor = index % 2 === 0 ? "bg-background-800" : "bg-background-600";
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
						rowIndex={index}
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
	<div className="flex items-center gap-2" style={{ height: lineHeight }}>
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

// Hidden row-line ruler. Renders the same DOM shape a real table cell
// produces — an `<input>` wrapped by the InputContainer focus-ring div and a
// `.mn-select__control` stub — so its measured height matches what users see.
// Both desktop ROW_HEIGHT and compact per-line height read from the same
// measurement so every table adapts uniformly to font-size or zoom changes.
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
			className="pointer-events-none invisible absolute flex items-center gap-2"
			style={{ left: -9999, top: -9999, width: 200 }}
		>
			<Input
				testId="rowLineRuler"
				readOnly
				value="Mp"
				placeholder=""
				onChange={() => {}}
			/>
			<div className="mn-select">
				<div className="mn-select__control">
					<div className="mn-select__value-container">
						<span className="mn-select__single-value">Mp</span>
					</div>
				</div>
			</div>
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
				style={{ height: height - headerHeight, width }}
				rowCount={rows.length}
				rowHeight={rowHeight}
				overscanCount={OVERSCAN_ROW_COUNT}
				rowComponent={CompactContentCell}
				rowProps={{ rows, compactLayout, columnsByTitle, testId }}
			/>
		</>
	);
};

function useParentDimensions(ref: React.RefObject<HTMLDivElement | null>): {
	width: number;
	height: number;
} {
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		const parent = el.parentNode as HTMLElement | null;
		if (!parent) return;

		const measure = () => {
			const style = window.getComputedStyle(parent);
			const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
			const paddingRight = Number.parseFloat(style.paddingRight || "0");
			const paddingTop = Number.parseFloat(style.paddingTop || "0");
			const paddingBottom = Number.parseFloat(style.paddingBottom || "0");
			const rect = parent.getBoundingClientRect();
			const height = rect.height - paddingTop - paddingBottom;
			const width = rect.width - paddingLeft - paddingRight;
			setDimensions((d) =>
				d.width === width && d.height === height ? d : { width, height },
			);
		};

		// Sync measure on mount (this is inside useLayoutEffect so the
		// parent already has its final laid-out size).
		measure();

		const ro = new ResizeObserver(() => measure());
		ro.observe(parent);
		return () => ro.disconnect();
	}, [ref]);

	return dimensions;
}

const VirtualTable = function VirtualTableRenderer({
	columns,
	rows,
	testId,
	isNewEntity,
	compactLayout,
}: VirtualTableProps & WithDataTestId) {
	const density = useTableDensity();
	const isCompact = density === "compact";
	const wrapperRef = useRef<HTMLDivElement>(null);
	const { width, height } = useParentDimensions(wrapperRef);

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
		<div ref={wrapperRef} className="h-full">
			<RowLineRuler onMeasure={setLineHeight} />
			{width > 0 && height > 0 ? (
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
			) : null}
		</div>
	);
};

export default VirtualTable;
