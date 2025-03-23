import { map, range } from "lodash";
import { observer } from "mobx-react-lite";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";

import Loading from "../../components/Loading";
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

const SHOW_MONTHS = 6;

const BudgetPeriods = observer(
	({ startingDate, setEditing, viewArchived }: PeriodProps) => {
		const [progress, setProgress] = useState(0);
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
						className={`grow w-[26em] ${height} pb-4`}
						key={`budgetPeriod_${viewArchived}_${formatDate(
							startOfMonthOffset(startingDate, offset),
						)}_${budgetIds}_${budgetArchives}`}
					>
						<Loading
							loading={progress !== 0 && progress !== 100}
							progress={progress}
						>
							<BudgetPeriod
								startingDate={startOfMonthOffset(startingDate, offset)}
								setEditing={setEditing}
								viewArchived={viewArchived}
								setProgress={setProgress}
							/>
						</Loading>
					</div>
				))}
			</div>
		);
	},
);

interface BudgetPeriodProps extends PeriodProps {
	setProgress: Dispatch<SetStateAction<number>>;
}

const BudgetPeriod = observer(
	({
		startingDate,
		setEditing,
		viewArchived,
		setProgress,
	}: BudgetPeriodProps) => {
		const Messages = useMessages();
		const { budget, currencies } = useMoneeeyStore();
		const starting = useMemo(() => formatDate(startingDate), [startingDate]);

		useEffect(() => {
			budget.makeEnvelopes(starting, (currentProgress) =>
				setProgress(currentProgress),
			);
		}, [setProgress, starting, budget]);
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
					schemaFilter={(b) =>
						b.starting === starting && (!b.budget.archived || viewArchived)
					}
					schema={[
						{
							title: Messages.budget.budget,
							width: 45,
							validate: () => ({ valid: true }),
							...LinkField<BudgetEnvelope>({
								read: ({ name }) => name,
								delta: () => ({}),
								onClick: (entity) => setEditing(entity.budget),
							}),
						},
						{
							title: Messages.budget.allocated,
							width: 60,
							validate: () => ({ valid: true }),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ allocated, budget: { currency_uuid } }) => ({
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
							customClass: () => "text-gray-400",
							validate: () => ({ valid: true }),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ used, budget: { currency_uuid } }) => ({
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
							customClass: ({ remaining }) =>
								remaining < 0 ? "opacity-80 text-red-200" : "opacity-80 ",
							validate: () => ({ valid: true }),
							...CurrencyAmountField<BudgetEnvelope>({
								read: ({ remaining, budget: { currency_uuid } }) => ({
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
