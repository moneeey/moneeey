import { compact, map, uniqBy } from "lodash";
import { observer } from "mobx-react";

import {
	AccountKind,
	type IAccount,
	type TAccountUUID,
} from "../../entities/Account";
import { isTransaction } from "../../entities/Transaction";
import type { EntityType } from "../../shared/Entity";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import { TagsFrom, TagsTo } from "../Tags";
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
	readOptions,
	clearable,
}: FieldAcessor<TEntity, TAccountUUID> & {
	readOptions(entity: TEntity): IAccount[];
	clearable: boolean;
}): FieldDefHelper<TEntity> {
	const Messages = useMessages();
	const { accounts, config } = useMoneeeyStore();

	const readName = (entity: TEntity) => accounts.nameForUuid(read(entity));

	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => {
				const currentUuid = read(entity);
				const currentName = accounts.nameForUuid(currentUuid);
				const tags = accounts
					.accountTags(read(entity))
					.filter((t) => t !== currentName);
				const Tags =
					field.title === Messages.transactions.from_account
						? TagsFrom
						: TagsTo;

				return (
					<Select
						testId={`editor${field.title.replace(" ", "_")}`}
						readOnly={readOnlyForFieldAndEntity(field, entity)}
						placeholder={field.title}
						isError={isError}
						value={read(entity)}
						clearable={clearable}
						options={uniqBy(
							compact([
								...map(readOptions(entity), (account) => ({
									label: account.name,
									value: account.account_uuid,
								})),
							]),
							"value",
						)}
						suffix={<Tags tags={tags} />}
						onChange={(value: string) =>
							commit({ ...entity, ...delta(value, entity) })
						}
						onCreate={(name: string) => {
							const account = {
								...accounts.factory(),
								kind: AccountKind.PAYEE,
								name,
							};
							const withEntityType = entity as { entity_type: EntityType };
							if (isTransaction(withEntityType)) {
								account.currency_uuid =
									compact(
										[
											withEntityType.from_account,
											withEntityType.to_account,
										].map(
											(account_uuid) =>
												accounts.byUuid(account_uuid)?.currency_uuid,
										),
									)[0] || config.main.default_currency;
							}
							accounts.merge(account);
							commit({ ...entity, ...delta(account.account_uuid, entity) });
						}}
					/>
				);
			},
		),
		groupBy: (row: TEntity): string => readName(row),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc
				? readName(a).localeCompare(readName(b))
				: readName(b).localeCompare(readName(a)),
	};
}
