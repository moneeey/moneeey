import { observer } from "mobx-react";

import { InputNumber, type InputNumberProps } from "../base/Input";

import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

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
		| "prefix"
		| "suffix"
		| "thousandSeparator"
		| "decimalSeparator"
		| "decimalScale"
	>): FieldDefHelper<TEntity> {
	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<InputNumber
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					thousandSeparator={thousandSeparator}
					decimalSeparator={decimalSeparator}
					decimalScale={decimalScale}
					value={read(entity)}
					prefix={prefix}
					suffix={suffix}
					onChange={(value) => commit({ ...entity, ...delta(value, entity) })}
				/>
			),
		),
		groupBy: (row: TEntity): string =>
			String(Math.floor(Math.log10(read(row)))),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a) - read(b) : read(b) - read(a),
	};
}
