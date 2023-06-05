import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import VirtualizedGrid, { GridCellRenderer } from 'react-virtualized/dist/commonjs/Grid';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';

import Icon from './base/Icon';

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
  render: (row: Row) => JSX.Element;
};

type VirtualTableProps = {
  columns: ColumnDef[];
  rows: Row[];
  isNewEntity?: (row: Row) => boolean;
};

type GridRenderCell = {
  rowIndex: number;
  columnIndex: number;
  style: object;
};

const SortIcon = ({ order }: { order?: 'descend' | 'ascend' }) => {
  if (order === 'ascend') {
    return (
      <Icon className='inline-block'>
        <ChevronUpIcon className='icon-small' />
      </Icon>
    );
  } else if (order === 'descend') {
    return (
      <Icon className='inline-block'>
        <ChevronDownIcon className='icon-small' />
      </Icon>
    );
  }

  return <span />;
};

const VirtualTable = function VirtualTableRenderer({ columns: originalColumns, rows, isNewEntity }: VirtualTableProps) {
  const [sort, setSort] = useState(() => {
    const column = originalColumns.find((col) => Boolean(col.defaultSortOrder)) || originalColumns[0];

    return { column, order: column.defaultSortOrder };
  });
  const columnsWithWidth = originalColumns.filter((col) => col.width);
  const columnsWithWidthTotalWidth = columnsWithWidth.reduce((total, cur) => total + (cur.width || 0), 0);

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
    <AutoSizer>
      {({ width, height }: { width: number; height: number }) => {
        const autoColumnSize = Math.max(
          (width - columnsWithWidthTotalWidth - 32) / (originalColumns.length - columnsWithWidth.length),
          MIN_COLUMN_WIDTH
        );

        const columns = originalColumns.map((col) => ({ ...col, width: col.width || autoColumnSize }));

        const HeaderCell = ({ columnIndex, style }: GridRenderCell) => {
          const column = columns[columnIndex];
          const onClick = () => {
            if (sort.column.sorter === column.sorter) {
              setSort({ column, order: sort.order === 'ascend' ? 'descend' : 'ascend' });
            } else {
              setSort({ column, order: 'ascend' });
            }
          };

          return (
            <span className='font-semibold' onClick={onClick} style={style}>
              {column.title} {sort.column.sorter === column.sorter && <SortIcon order={sort.order} />}
            </span>
          );
        };

        const ContentCell = ({ rowIndex, columnIndex, style }: GridRenderCell) => {
          const column = columns[columnIndex];
          const Renderer = column.render;
          const row = sortedRows[rowIndex];

          const result = row ? (
            <span style={style}>
              <Renderer entityId={row.entityId} />
            </span>
          ) : (
            <span style={style} />
          );

          return result;
        };

        const Grid = ({
          className,
          gridHeight,
          rowCount,
          RenderCell,
        }: {
          className: string;
          gridHeight: number;
          rowCount: number;
          RenderCell: (props: GridRenderCell) => JSX.Element;
        }) => (
          <VirtualizedGrid
            className={className}
            height={gridHeight}
            width={width}
            rowCount={rowCount}
            rowHeight={ROW_HEIGHT}
            columnWidth={({ index }) => columns[index].width}
            columnCount={columns.length}
            cellRenderer={({ columnIndex, rowIndex, style }) => (
              <RenderCell
                key={`${columnIndex}_${rowIndex}`}
                style={style}
                columnIndex={columnIndex}
                rowIndex={rowIndex}
              />
            )}
          />
        );

        return (
          <>
            <Grid
              className='bg-background-700 pl-2 pr-2'
              gridHeight={ROW_HEIGHT}
              rowCount={1}
              RenderCell={({ columnIndex, rowIndex, style }) => (
                <HeaderCell
                  key={`${columnIndex}_${rowIndex}`}
                  style={style}
                  columnIndex={columnIndex}
                  rowIndex={rowIndex}
                />
              )}
            />
            <Grid
              className='bg-background-800 pb-2 pl-2 pr-2'
              gridHeight={height - ROW_HEIGHT}
              rowCount={sortedRows.length}
              RenderCell={({ columnIndex, rowIndex, style }) => (
                <ContentCell
                  key={`${columnIndex}_${rowIndex}`}
                  style={style}
                  columnIndex={columnIndex}
                  rowIndex={rowIndex}
                />
              )}
            />
          </>
        );
      }}
    </AutoSizer>
  );
};

export { VirtualTable, VirtualTable as default };
