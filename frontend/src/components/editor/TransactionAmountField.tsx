import { observer } from 'mobx-react';

import { CurrencyAmount, ICurrency } from '../../entities/Currency';

import CurrencyAmountField from './CurrencyAmountField';
import { FieldAcessor, FieldDef, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({
  read,
  delta,
}: FieldAcessor<
  TEntity,
  { to: { amount: number; currency?: ICurrency }; from: { amount: number; currency?: ICurrency } }
>): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => {
      const { to, from } = read(entity);

      if (to.currency?.currency_uuid === from.currency?.currency_uuid) {
        const fromToField = CurrencyAmountField<CurrencyAmount>({
          read: (entityy) => entityy,
          delta: (update) => update,
        });

        return (
          <fromToField.render
            entity={from}
            field={field as FieldDef<CurrencyAmount>}
            isError={isError}
            commit={(amount: CurrencyAmount) => commit({ ...entity, ...delta({ to: amount, from: amount }) })}
          />
        );
      }

      const fromField = CurrencyAmountField<CurrencyAmount>({
        read: (entityy) => entityy,
        delta: (update) => update,
      });
      const toField = CurrencyAmountField<CurrencyAmount>({
        read: (entityy) => entityy,
        delta: (update) => update,
      });

      return (
        <div className='flex flex-row'>
          <fromField.render
            entity={from}
            field={field as FieldDef<CurrencyAmount>}
            isError={isError}
            commit={(amount: CurrencyAmount) => commit({ ...entity, ...delta({ to, from: amount }) })}
          />
          <toField.render
            entity={to}
            field={field as FieldDef<CurrencyAmount>}
            isError={isError}
            commit={(amount: CurrencyAmount) => commit({ ...entity, ...delta({ to: amount, from }) })}
          />
        </div>
      );
    }),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
      asc ? read(a).from.amount - read(b).from.amount : read(b).from.amount - read(a).from.amount,
  };
}
