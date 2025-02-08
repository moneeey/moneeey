import { observer } from "mobx-react";

import { AccountKind } from "../../entities/Account";
import useMessages from "../../utils/Messages";
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
}: FieldAcessor<TEntity, AccountKind>): FieldDefHelper<TEntity> {
	const Messages = useMessages();

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<Select
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={readOnlyForFieldAndEntity(field, entity)}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					options={Object.values(AccountKind).map((accountType) => ({
						label: Messages.account[`kind_${accountType}`],
						value: accountType,
					}))}
					onChange={(value: string) =>
						commit({ ...entity, ...delta(value as AccountKind) })
					}
				/>
			),
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
	};
}
