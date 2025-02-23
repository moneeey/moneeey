import { observer } from "mobx-react";

import {
	type TDate,
	compareDates,
	formatDate,
	parseDateOrTime,
} from "../../utils/Date";
import DatePicker from "../base/DatePicker";

import useMoneeeyStore from "../../shared/useMoneeeyStore";
import {
	type FieldAcessor,
	type FieldDefHelper,
	type FieldRenderProps,
	readOnlyForFieldAndEntity,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, TDate>): FieldDefHelper<TEntity> {
	const { config } = useMoneeeyStore();

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<DatePicker
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					dateFormat={config.main.date_format}
					value={parseDateOrTime(read(entity))}
					onChange={(value) =>
						commit({ ...entity, ...delta(formatDate(value)) })
					}
				/>
			),
		),
		groupBy: (row: TEntity): string => formatDate(parseDateOrTime(read(row))),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? compareDates(read(a), read(b)) : compareDates(read(b), read(a)),
	};
}
