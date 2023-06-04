import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import React, { ReactNode, useMemo, useRef, useState } from 'react';
import useVirtual from 'react-cool-virtual';

const MIN_COLUMN_WIDTH = 100;

const ROW_HEIGHT = 24;

export type Row = {
  entityId: string;
};

export type ColumnDef = {
  width?: number;
  title: string;
  index: number;
  defaultSortOrder?: 'descend' | 'ascend';
  sorter?: (a: Row, b: Row, asc: boolean) => number;
  render: (row: Row) => React.ReactNode;
};

type VirtualTableProps = {
  className?: string;
  columns: ColumnDef[];
  rows: Row[];
  isNewEntity?: (row: Row) => boolean;
};

type GridRenderCell = {
  rowIndex: number;
  columnIndex: number;
};

type GridRenderer = {
  renderCell: (props: GridRenderCell) => ReactNode;
  onGridDimensions: (width: number, height: number) => void;
  onGridClick: (column: ColumnDef, rowIndex: number) => void;
  sort: {
    column: ColumnDef;
    order?: 'descend' | 'ascend';
  };
};

const VirtualGrid = ({
  rows,
  columns,
  renderCell,
  sort,
  onGridDimensions,
  onGridClick,
  className,
}: VirtualTableProps & GridRenderer) => {
  const ref = useRef<HTMLDivElement | null>();
  const row = useVirtual({
    itemCount: 1 + rows.length,
    itemSize: ROW_HEIGHT,
    stickyIndices: [0],
  });
  const col = useVirtual({
    horizontal: true,
    itemCount: columns.length,
    itemSize: (idx) => columns[idx].width || 60,
    onResize: ({ width, height }) => onGridDimensions(width, height),
  });

  const SortIcon = (order?: 'descend' | 'ascend') => {
    if (order === 'ascend') {
      return <ChevronUpIcon className='icon-small' />;
    } else if (order === 'descend') {
      return <ChevronDownIcon className='icon-small' />;
    }

    return <span />;
  };

  return (
    <div
      className={`overflow-auto ${className || ''}`}
      ref={(el) => {
        row.outerRef.current = el;
        col.outerRef.current = el;
        ref.current = el;
        onGridDimensions(el?.clientWidth || 0, el?.clientHeight || 0);
      }}>
      <div
        className='relative block'
        ref={(el) => {
          row.innerRef.current = el;
          col.innerRef.current = el;
        }}>
        {row.items.map((rowItem) =>
          col.items.map((colItem) => (
            <div
              key={`${rowItem.index}_${colItem.index}`}
              className={`absolute bg-background-800 ${rowItem.index === 0 ? 'font-semibold' : ''}`}
              style={{
                top: rowItem.isSticky ? 0 : rowItem.start,
                left: colItem.start,
                height: rowItem.size,
                width: colItem.size,
              }}
              onClick={() => onGridClick(columns[colItem.index], rowItem.index)}>
              {rowItem.isSticky
                ? columns[colItem.index].title
                : renderCell({ rowIndex: rowItem.index - 1, columnIndex: colItem.index })}
              {rowItem.index === 0 && sort.column.sorter === columns[colItem.index].sorter ? SortIcon(sort.order) : ''}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const VirtualTable = function VirtualTableRenderer({
  columns: originalColumns,
  rows,
  isNewEntity,
  className,
}: VirtualTableProps) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sort, setSort] = useState(() => {
    const column = originalColumns.find((col) => Boolean(col.defaultSortOrder)) || originalColumns[0];

    return { column, order: column.defaultSortOrder };
  });
  const columnsWithWidth = originalColumns.filter((col) => col.width);
  const columnsWithWidthTotalWidth = columnsWithWidth.reduce((total, cur) => total + (cur.width || 0), 0);
  const autoColumnSize = Math.max(
    (viewportWidth - columnsWithWidthTotalWidth) / (originalColumns.length - columnsWithWidth.length),
    MIN_COLUMN_WIDTH
  );

  const renderCell = ({ rowIndex, columnIndex }: GridRenderCell) => {
    const column = columns[columnIndex];
    const renderer = column.render;
    const row = rows[rowIndex];

    return row && renderer(row);
  };
  const columns = originalColumns.map((col) => ({ ...col, width: col.width || autoColumnSize }));

  const sortedRows = useMemo(
    () =>
      rows.sort((a: Row, b: Row) => {
        if (isNewEntity && isNewEntity(a)) {
          return +1;
        }
        if (isNewEntity && isNewEntity(b)) {
          return -1;
        }
        const sortFn = sort.column.sorter || (() => 0);

        return sortFn(a, b, sort.order === 'ascend');
      }),
    [rows, sort]
  );

  return (
    <VirtualGrid
      columns={columns}
      rows={sortedRows}
      renderCell={renderCell}
      className={className}
      sort={sort}
      onGridDimensions={(width) => setViewportWidth(width - 32)}
      onGridClick={(column, rowIdx) => {
        if (rowIdx === 0) {
          if (sort.column.sorter === column.sorter) {
            setSort({ column, order: sort.order === 'ascend' ? 'descend' : 'ascend' });
          } else {
            setSort({ column, order: 'ascend' });
          }
        }
      }}
    />
  );
};

export { VirtualTable, VirtualTable as default };
