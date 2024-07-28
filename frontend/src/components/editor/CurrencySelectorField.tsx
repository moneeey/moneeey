import { map } from "lodash";
import { observer } from "mobx-react";

import useMoneeeyStore from "../../shared/useMoneeeyStore";
import Select from "../base/Select";

import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, string>): FieldDefHelper<TEntity> {
	const { currencies } = useMoneeeyStore();

	const readName = (entity: TEntity) => currencies.nameForUuid(read(entity));

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<Select
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					options={map(currencies.all, (currency) => ({
						label: (
							<span>
								<b>{currency.short}</b> {currency.name}
							</span>
						),
						value: currency.currency_uuid,
					}))}
					onChange={(value: string) => commit({ ...entity, ...delta(value) })}
				/>
			),
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc
				? readName(a).localeCompare(readName(b))
				: readName(b).localeCompare(readName(a)),
	};
}
