import { observer } from "mobx-react";

import { Input } from "../base/Input";

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
	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<Input
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					onChange={(value: string) =>
						commit({ ...entity, ...delta(value, entity) })
					}
				/>
			),
		),
		groupBy: (row: TEntity): string => read(row),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
	};
}
