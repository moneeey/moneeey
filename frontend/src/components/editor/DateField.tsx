import { observer } from "mobx-react";

import {
	type TDate,
	compareDates,
	formatDate,
	parseDateOrTime,
} from "../../utils/Date";
import DatePicker from "../base/DatePicker";

import type {
	FieldAcessor,
	FieldDefHelper,
	FieldRenderProps,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, TDate>): FieldDefHelper<TEntity> {
	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<DatePicker
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={field.readOnly}
					placeholder={field.title}
					isError={isError}
					value={parseDateOrTime(read(entity))}
					onChange={(value) =>
						commit({ ...entity, ...delta(formatDate(value)) })
					}
				/>
			),
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? compareDates(read(a), read(b)) : compareDates(read(b), read(a)),
	};
}
