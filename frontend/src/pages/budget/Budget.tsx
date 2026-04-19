import { observer } from "mobx-react";
import { type Dispatch, type SetStateAction, useState } from "react";

import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import { Checkbox } from "../../components/base/Input";
import Space, { VerticalSpace } from "../../components/base/Space";
import type { IBudget } from "../../entities/Budget";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { formatDateMonth, startOfMonthOffset } from "../../utils/Date";
import useMessages, { type TMessages } from "../../utils/Messages";

import { PlusCircleIcon } from "@heroicons/react/24/outline";
import BudgetEditor from "./BudgetEditor";
import BudgetPeriods from "./BudgetPeriod";

type MonthDateSelectorProps = {
	setDate: Dispatch<SetStateAction<Date>>;
	date: Date;
	Messages: TMessages;
};
const MonthDateSelector = ({
	setDate,
	date,
	Messages,
}: MonthDateSelectorProps) => (
	<Space className="justify-center">
		<SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -1))}>
			{Messages.budget.prev}
		</SecondaryButton>
		<span>{formatDateMonth(date)}</span>
		<SecondaryButton onClick={() => setDate(startOfMonthOffset(date, +1))}>
			{Messages.budget.next}
		</SecondaryButton>
	</Space>
);

export const BudgetHeader = observer(() => {
	const Messages = useMessages();
	const { budget, navigation } = useMoneeeyStore();
	const onNewBudget = () => navigation.updateEditingBudget(budget.factory());
	return (
		<Space>
			<PrimaryButton
				testId="addNewBudget"
				onClick={onNewBudget}
				className="text-sm"
			>
				<PlusCircleIcon className="h-5 w-5 text-primary-900 mr-1" />
				{Messages.budget.new}
			</PrimaryButton>
		</Space>
	);
});

const Budget = observer(() => {
	const Messages = useMessages();
	const { config, navigation } = useMoneeeyStore();
	const [startingDate, setStartingDate] = useState(() =>
		startOfMonthOffset(new Date(), 0),
	);
	const viewArchived = config.main?.view_archived === true;
	const editing = navigation.editingBudget;
	const setEditing = (budget?: IBudget) =>
		navigation.updateEditingBudget(budget);

	return (
		<VerticalSpace className="overflow-auto pr-2 pb-4">
			<Space className="justify-between flex-wrap">
				<Checkbox
					testId="checkboxViewArchived"
					value={config.main.view_archived === true}
					onChange={(view_archived) =>
						config.merge({ ...config.main, view_archived })
					}
					placeholder={Messages.budget.show_archived}
				>
					{Messages.budget.show_archived}
				</Checkbox>
				<BudgetHeader />
			</Space>
			<MonthDateSelector
				date={startingDate}
				setDate={setStartingDate}
				Messages={Messages}
			/>
			<BudgetPeriods
				startingDate={startingDate}
				setEditing={setEditing}
				viewArchived={viewArchived}
			/>
			{editing && <BudgetEditor editing={editing} setEditing={setEditing} />}
		</VerticalSpace>
	);
});

export default Budget;
