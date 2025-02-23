import { observer } from "mobx-react";

import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { MultiSelect } from "../base/Select";

import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, string[]>): FieldDefHelper<TEntity> {
	const { tags } = useMoneeeyStore();

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<MultiSelect
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					options={tags.all.map((tag) => ({ label: tag, value: tag }))}
					onChange={(value: string[]) => commit({ ...entity, ...delta(value) })}
					onCreate={(value: string) => {
						tags.register(value);
						commit({ ...entity, ...delta([...read(entity), value]) });
					}}
				/>
			),
		),
		groupBy: (row: TEntity): string => read(row).join(", "),
		sorter: (): number => 0,
	};
}
