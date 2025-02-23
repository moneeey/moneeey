import { observer } from "mobx-react";

import type {
	FieldAcessor,
	FieldDefHelper,
	FieldRenderProps,
} from "./FieldDef";

export default function <TEntity>({
	read,
}: FieldAcessor<TEntity, string>): FieldDefHelper<TEntity> {
	return {
		render: observer(({ entity, field }: FieldRenderProps<TEntity>) => (
			<span data-testid={`editor${field.title.replace(" ", "_")}`}>
				{read(entity)}
			</span>
		)),
		groupBy: (row: TEntity): string => read(row),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
	};
}
