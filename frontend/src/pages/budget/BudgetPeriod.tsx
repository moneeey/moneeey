import { map, range } from "lodash";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import TableEditor from "../../components/TableEditor";
import Card from "../../components/base/Card";
import { TextTitle } from "../../components/base/Text";
import CurrencyAmountField from "../../components/editor/CurrencyAmountField";
import LinkField from "../../components/editor/LinkField";
import type { IBudget } from "../../entities/Budget";
import type { BudgetEnvelope } from "../../entities/BudgetEnvelope";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import {
	formatDate,
	formatDateMonth,
	startOfMonthOffset,
} from "../../utils/Date";
import useMessages from "../../utils/Messages";

interface PeriodProps {
	startingDate: Date;
	setEditing: (budget?: IBudget) => void;
	viewArchived: boolean;
}

const archivedRowClass = (envelope: BudgetEnvelope): string =>
	envelope.budget?.archived ? "archived-row opacity-50 italic" : "";

const SHOW_MONTHS = 6;

const BudgetPeriods = observer(
	({ startingDate, setEditing, viewArchived }: PeriodProps) => {
		const { budget } = useMoneeeyStore();
		const budgetIds = budget.ids.join("_");
		const budgetArchives = budget.all
			.map(({ archived }) => String(archived))
			.join("_");
		const budgetAmount = budget.ids.length;
		const height =
			budgetAmount < 4
				? "h-[10em]"
				: budgetAmount < 8
					? "h-[16em]"
					: budgetAmount < 12
						? "h-[22em]"
						: "h-[28em]";

		return (
			<div className="flex flex-row flex-wrap gap-4">
				{map(range(0, SHOW_MONTHS), (offset) => (
					<div
						className={`grow w-full md:w-[26em] md:max-w-[calc(50%-0.5rem)] ${height} pb-4`}
						key={`budgetPeriod_${viewArchived}_${formatDate(
							startOfMonthOffset(startingDate, offset),
						)}_${budgetIds}_${budgetArchives}`}
					>
						<BudgetPeriod
							startingDate={startOfMonthOffset(startingDate, offset)}
							setEditing={setEditing}
							viewArchived={viewArchived}
						/>
					</div>
				))}
			</div>
		);
	},
);

const BudgetPeriod = observer(
	({ startingDate, setEditing, viewArchived }: PeriodProps) => {
		const Messages = useMessages();
		const { budget, currencies } = useMoneeeyStore();
		const starting = formatDate(startingDate);

		useEffect(() => {
			budget.seedEnvelopes(starting);
		}, [budget, starting]);

		return (
			<Card
				className="h-full w-full"
				testId={`budget_period_${formatDateMonth(startingDate)}`}
				header={
					<TextTitle className="flex flex-row justify-between">
						<div>{formatDateMonth(startingDate)}</div>
					</TextTitle>
				}
			>
				<TableEditor
					testId={`budget_period_table_${formatDateMonth(startingDate)}`}
					store={budget.envelopes}
					factory={budget.envelopes.factory}
					creatable={false}
					schemaFilter={(b) => {
						if (b.starting !== starting) return false;
						if (!b.budget) return false;
						return !b.budget.archived || viewArchived;
					}}
					schema={[
						{
							title: Messages.budget.budget,
							width: 45,
							validate: () => ({ valid: true }),
							customClass: (b) => archivedRowClass(b),
							...LinkField<BudgetEnvelope>({
								read: ({ name, budget: parent }) =>
									parent?.archived ? `${name} (archived)` : name,
								delta: () => ({}),
								onClick: (entity) => entity.budget && setEditing(entity.budget),
							}),
						},
						{
							title: Messages.budget.allocated,
							width: 60,
							validate: () => ({ valid: true }),
							customClass: (b) => archivedRowClass(b),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ allocated, currency_uuid }) => ({
									amount: allocated,
									currency: currencies.byUuid(currency_uuid),
								}),
								delta: ({ amount: allocated }) => ({ allocated }),
							}),
						},
						{
							title: Messages.budget.used,
							width: 60,
							readOnly: true,
							customClass: (b) => `text-muted ${archivedRowClass(b)}`.trim(),
							validate: () => ({ valid: true }),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ used, currency_uuid }) => ({
									amount: used,
									currency: currencies.byUuid(currency_uuid),
								}),
								delta: () => ({}),
							}),
						},
						{
							title: Messages.budget.remaining,
							width: 50,
							readOnly: true,
							customClass: (b) =>
								`${
									b.remaining < 0 ? "opacity-80 text-negative" : "opacity-80"
								} ${archivedRowClass(b)}`.trim(),
							validate: () => ({ valid: true }),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ remaining, currency_uuid }) => ({
									amount: remaining,
									currency: currencies.byUuid(currency_uuid),
								}),
								delta: () => ({}),
							}),
						},
					]}
				/>
			</Card>
		);
	},
);

export default BudgetPeriods;
