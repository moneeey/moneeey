import { observer } from "mobx-react";

import type { CurrencyAmount } from "../../entities/Currency";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import { InputNumber } from "../base/Input";

import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, CurrencyAmount>): FieldDefHelper<TEntity> {
	const { config } = useMoneeeyStore();

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => {
				const { amount, currency } = read(entity);

				return (
					<InputNumber
						testId={`editor${field.title.replace(" ", "_")}`}
						readOnly={readOnlyForFieldAndEntity(field, entity)}
						placeholder={field.title}
						isError={isError}
						value={amount}
						onChange={(newAmount) =>
							commit({ ...entity, ...delta({ currency, amount: newAmount }) })
						}
						thousandSeparator={config.main.thousand_separator}
						decimalSeparator={config.main.decimal_separator}
						decimalScale={currency?.decimals || 2}
						prefix={currency?.prefix}
						suffix={currency?.suffix}
					/>
				);
			},
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a).amount - read(b).amount : read(b).amount - read(a).amount,
	};
}
