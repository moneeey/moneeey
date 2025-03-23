import { observer } from "mobx-react";

import { Checkbox } from "../base/Input";

import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, boolean>): FieldDefHelper<TEntity> {
	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<Checkbox
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					onChange={(value: boolean) => commit({ ...entity, ...delta(value, entity) })}
				>
					{field.title}
				</Checkbox>
			),
		),
		groupBy: (row: TEntity): string => (read(row) ? "Y" : "N"),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc
				? Number(read(a)) - Number(read(b))
				: Number(read(b)) - Number(read(a)),
	};
}
