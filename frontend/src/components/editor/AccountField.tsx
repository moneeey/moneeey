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

import type {
	FieldAcessor,
	FieldDefHelper,
	FieldRenderProps,
} from "./FieldDef";

export default function <TEntity>({
	read,
	delta,
	readOptions,
}: FieldAcessor<TEntity, TAccountUUID> & {
	readOptions(): IAccount[];
	clearable: boolean;
}): FieldDefHelper<TEntity> {
	const Messages = useMessages();
	const { accounts } = useMoneeeyStore();

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
						readOnly={field.readOnly}
						placeholder={field.title}
						isError={isError}
						value={read(entity)}
						options={uniqBy(
							compact([
								...map(readOptions(), (account) => ({
									label: account.name,
									value: account.account_uuid,
								})),
							]),
							"value",
						)}
						suffix={<Tags tags={tags} />}
						onChange={(value: string) => commit({ ...entity, ...delta(value) })}
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
									)[0] || account.currency_uuid;
							}
							accounts.merge(account);
							commit({ ...entity, ...delta(account.account_uuid) });
						}}
					/>
				);
			},
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc
				? readName(a).localeCompare(readName(b))
				: readName(b).localeCompare(readName(a)),
	};
}
