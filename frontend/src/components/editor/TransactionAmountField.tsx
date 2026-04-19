import { observer } from "mobx-react";

import type { CurrencyAmount, ICurrency } from "../../entities/Currency";

import CurrencyAmountField from "./CurrencyAmountField";
import type {
	FieldAcessor,
	FieldDef,
	FieldDefHelper,
	FieldRenderProps,
} from "./FieldDef";

type TransactionAmountValue = {
	to: { amount: number; currency?: ICurrency };
	from: { amount: number; currency?: ICurrency };
};

type TransactionAmountOptions<TEntity> = FieldAcessor<
	TEntity,
	TransactionAmountValue
> & {
	side?: "from" | "to";
};

export default function <TEntity>({
	read,
	delta,
	side,
}: TransactionAmountOptions<TEntity>): FieldDefHelper<TEntity> {
	return {
		render: observer(
			({ entity, commit, field, isError, rev }: FieldRenderProps<TEntity>) => {
				const { to, from } = read(entity);
				const renderField = field as unknown as FieldDef<CurrencyAmount>;

				const sameCurrency =
					to.currency?.currency_uuid === from.currency?.currency_uuid ||
					!to.currency ||
					!from.currency;

				const unifiedCommit = (amount: CurrencyAmount) =>
					commit({
						...entity,
						...delta({ to: amount, from: amount }, entity),
					});

				const fromCommit = (amount: CurrencyAmount) =>
					commit({
						...entity,
						...delta({ to, from: amount }, entity),
					});

				const toCommit = (amount: CurrencyAmount) =>
					commit({
						...entity,
						...delta({ to: amount, from }, entity),
					});

				const fromField = CurrencyAmountField<CurrencyAmount>({
					read: (e) => e,
					delta: (u) => u,
				});
				const toField = CurrencyAmountField<CurrencyAmount>({
					read: (e) => e,
					delta: (u) => u,
				});

				if (side === "from") {
					const effectiveCommit = sameCurrency ? unifiedCommit : fromCommit;
					return (
						<fromField.render
							rev={rev}
							entity={from}
							field={renderField}
							isError={isError}
							commit={effectiveCommit}
						/>
					);
				}

				if (side === "to") {
					// Same-currency renders the unified `from` entity (to==from by value);
					// different-currency shows the independent `to` value.
					const effectiveEntity = sameCurrency ? from : to;
					const effectiveCommit = sameCurrency ? unifiedCommit : toCommit;
					return (
						<toField.render
							rev={rev}
							entity={effectiveEntity}
							field={renderField}
							isError={isError}
							commit={effectiveCommit}
						/>
					);
				}

				if (sameCurrency) {
					return (
						<fromField.render
							rev={rev}
							entity={from}
							field={renderField}
							isError={isError}
							commit={unifiedCommit}
						/>
					);
				}

				return (
					<div className="flex flex-row">
						<fromField.render
							rev={rev}
							entity={from}
							field={renderField}
							isError={isError}
							commit={fromCommit}
						/>
						<toField.render
							rev={rev}
							entity={to}
							field={renderField}
							isError={isError}
							commit={toCommit}
						/>
					</div>
				);
			},
		),
		groupBy: (row: TEntity): string =>
			String(
				Math.floor(Math.log10(read(row).from.amount || read(row).to.amount)),
			),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc
				? read(a).from.amount - read(b).from.amount
				: read(b).from.amount - read(a).from.amount,
	};
}
