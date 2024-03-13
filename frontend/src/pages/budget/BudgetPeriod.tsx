import { PlusCircleIcon } from "@heroicons/react/24/outline";
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
import { LinkButton } from "../../components/base/Button";
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
	setEditing: Dispatch<SetStateAction<IBudget | undefined>>;
	viewArchived: boolean;
}

const BudgetPeriods = observer(
	({
		startingDate,
		setEditing,
		viewArchived,
		viewMonths,
	}: PeriodProps & { viewMonths: number }) => {
		const [progress, setProgress] = useState(0);

		return (
			<>
				{map(range(0, viewMonths), (offset) => (
					<Loading
						key={offset}
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
				))}
			</>
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
		const onNewBudget = () => setEditing(budget.factory());

		return (
			<Card
				testId={`budget_period_${formatDateMonth(startingDate)}`}
				header={
					<TextTitle className="flex flex-row justify-between">
						<div>{formatDateMonth(startingDate)}</div>
						<LinkButton onClick={onNewBudget} className="text-sm">
							<PlusCircleIcon
								style={{
									color: "lightgreen",
									width: "1.2em",
									height: "1.2em",
									marginRight: "0.5em",
								}}
							/>
							{Messages.budget.new}
						</LinkButton>
					</TextTitle>
				}
			>
				<div className="h-full min-h-[16em]">
					<TableEditor
						testId={`budget_period_table_${formatDateMonth(startingDate)}`}
						store={budget.envelopes}
						factory={budget.envelopes.factory}
						creatable={false}
						schemaFilter={(b) =>
							b.starting === starting && (!b.budget.archived || viewArchived)
						}
						showRecentEntries={false}
						schema={[
							{
								title: Messages.budget.budget,
								width: 80,
								validate: () => ({ valid: true }),
								...LinkField<BudgetEnvelope>({
									read: ({ name }) => name,
									delta: () => ({}),
									onClick: (entity) => setEditing(entity.budget),
								}),
							},
							{
								title: Messages.budget.allocated,
								width: 90,
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
								width: 90,
								readOnly: true,
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
								width: 90,
								readOnly: true,
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
				</div>
			</Card>
		);
	},
);

export default BudgetPeriods;
