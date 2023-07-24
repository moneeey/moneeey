import { observer } from 'mobx-react';

import { InputNumber, InputNumberProps } from '../base/Input';

import { FieldAcessor, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({
  read,
  delta,
  prefix,
  suffix,
  thousandSeparator,
  decimalSeparator,
  decimalScale,
}: FieldAcessor<TEntity, number> &
  Pick<
    InputNumberProps,
    'prefix' | 'suffix' | 'thousandSeparator' | 'decimalSeparator' | 'decimalScale'
  >): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
      <InputNumber
        testId={`editor${field.title.replace(' ', '_')}`}
        readOnly={field.readOnly}
        placeholder={field.title}
        isError={isError}
        thousandSeparator={thousandSeparator}
        decimalSeparator={decimalSeparator}
        decimalScale={decimalScale}
        value={read(entity)}
        prefix={prefix}
        suffix={suffix}
        onChange={(value) => commit({ ...entity, ...delta(value) })}
      />
    )),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number => (asc ? read(a) - read(b) : read(b) - read(a)),
  };
}
