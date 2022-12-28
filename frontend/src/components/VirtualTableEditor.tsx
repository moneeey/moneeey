import React, { ReactNode } from 'react';
import useVirtual from 'react-cool-virtual';

import './VirtualTableEditor.less';

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
  renderCell: ({ rowIndex, columnIndex }: GridRenderCell) => ReactNode;
};

const Grid = <Row,>({ rows, columns, className, renderCell }: VirtualTableProps<Row> & GridRenderer) => {
  const row = useVirtual({
    itemCount: rows.length,
    itemSize: 24,
  });
  const col = useVirtual({
    horizontal: true,
    itemCount: columns.length,
    itemSize: 160,
  });

  return (
    <div
      className={`mn-virtualtable ${className || ''}`}
      style={{ width: '400px', height: '400px', overflow: 'auto' }}
      ref={(el) => {
        row.outerRef.current = el;
        col.outerRef.current = el;
      }}>
      <div
        style={{ position: 'relative' }}
        ref={(el) => {
          row.innerRef.current = el;
          col.innerRef.current = el;
        }}>
        {row.items.map((rowItem) => (
          <div key={rowItem.index} className='mn-tr'>
            {col.items.map((colItem) => (
              <div
                key={colItem.index}
                ref={colItem.measureRef}
                className='mn-td'
                style={{
                  position: 'absolute',
                  height: `${rowItem.size}px`,
                  width: `${colItem.size}px`,
                  transform: `translateX(${colItem.start}px) translateY(${rowItem.start}px)`,
                }}>
                {renderCell({ rowIndex: rowItem.index, columnIndex: colItem.index })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const VirtualTable = function VirtualTableRenderer<Row>({ columns: originalColumns, rows }: VirtualTableProps<Row>) {
  const renderCell = ({ rowIndex, columnIndex }: GridRenderCell) => {
    const column = columns[columnIndex];
    const renderer = column.render || ((o) => <>{o}</>);
    const row = rows[rowIndex];
    const value = column.fieldName && row[column.fieldName];

    return renderer(value, row);
  };

  const columnsWithWidth = originalColumns.filter((col) => col.width);
  const columnsWithWidthTotalWidth = columnsWithWidth.reduce((total, cur) => total + (cur.width || 0), 0);
  const autoColumnSize = columnsWithWidthTotalWidth / (originalColumns.length - columnsWithWidth.length);

  const columns = originalColumns.map((col) => ({
    ...col,
    width: col.width || autoColumnSize,
  }));

  return <Grid columns={columns} rows={rows} renderCell={renderCell} />;
};

export { VirtualTable, VirtualTable as default };
