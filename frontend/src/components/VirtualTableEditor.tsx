import React, { ReactNode, useState } from 'react';
import useVirtual from 'react-cool-virtual';

import './VirtualTableEditor.less';

const MIN_COLUMN_WIDTH = 60;
const ROW_HEIGHT = 26;

export type ColumnDef<Row> = {
  width?: number;
  title: string;
  fieldName?: keyof Row;
  defaultSortOrder?: 'descend' | 'ascend';
  sorter?: (a: Row, b: Row, asc: boolean) => number;
  render?: (value: unknown, row: Row) => React.ReactNode;
};

type VirtualTableProps<Row> = {
  className?: string;
  columns: ColumnDef<Row>[];
  rows: Row[];
};

type GridRenderCell = {
  rowIndex: number;
  columnIndex: number;
};

type GridRenderer = {
  renderCell: (props: GridRenderCell) => ReactNode;
  onGridDimensions: (width: number, height: number) => void;
};

const Grid = <Row,>({
  rows,
  columns,
  renderCell,
  onGridDimensions,
  className,
}: VirtualTableProps<Row> & GridRenderer) => {
  const row = useVirtual({
    itemCount: 1 + rows.length,
    itemSize: ROW_HEIGHT,
    stickyIndices: [0],
  });
  const col = useVirtual({
    horizontal: true,
    itemCount: columns.length,
    itemSize: (idx) => columns[idx].width || 60,
  });

  return (
    <div
      className={`mn-virtualtable ${className || ''}`}
      style={{ overflow: 'auto ' }}
      ref={(el) => {
        row.outerRef.current = el;
        col.outerRef.current = el;
        onGridDimensions(el?.clientWidth || 0, el?.clientHeight || 0);
      }}>
      <div
        ref={(el) => {
          row.innerRef.current = el;
          col.innerRef.current = el;
        }}>
        {row.items.map((rowItem) => (
          <div
            key={rowItem.index}
            className='mn-tr'
            style={{
              top: rowItem.isSticky ? 0 : rowItem.start,
              width: '100%',
              height: `${ROW_HEIGHT}px`,
            }}>
            {col.items.map((colItem) => (
              <div
                key={colItem.index}
                ref={colItem.measureRef}
                className={rowItem.isSticky ? 'mn-th' : 'mn-td'}
                style={{
                  position: rowItem.isSticky ? 'sticky' : undefined,
                  left: colItem.start,
                  height: `${rowItem.size}px`,
                  width: `${colItem.size}px`,
                }}>
                {rowItem.isSticky
                  ? columns[colItem.index].title
                  : renderCell({ rowIndex: rowItem.index - 1, columnIndex: colItem.index })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const VirtualTable = function VirtualTableRenderer<Row>({
  columns: originalColumns,
  rows,
  className,
}: VirtualTableProps<Row>) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const columnsWithWidth = originalColumns.filter((col) => col.width);
  const columnsWithWidthTotalWidth = columnsWithWidth.reduce((total, cur) => total + (cur.width || 0), 0);
  const autoColumnSize = Math.max(
    (viewportWidth - columnsWithWidthTotalWidth) / (originalColumns.length - columnsWithWidth.length),
    MIN_COLUMN_WIDTH
  );

  const renderCell = ({ rowIndex, columnIndex }: GridRenderCell) => {
    const column = columns[columnIndex];
    const renderer = column.render || ((o) => <>{o}</>);
    const row = rows[rowIndex];
    const value = column.fieldName && row && row[column.fieldName];

    return row && renderer(value, row);
  };
  const columns = originalColumns.map((col) => ({ ...col, width: col.width || autoColumnSize }));

  return (
    <Grid
      columns={columns}
      rows={rows}
      renderCell={renderCell}
      className={className}
      onGridDimensions={(width) => setViewportWidth(width - 32)}
    />
  );
};

export { VirtualTable, VirtualTable as default };
