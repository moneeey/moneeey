import { observer } from "mobx-react";
import { type Dispatch, type SetStateAction, useState } from "react";

import { LinkButton, SecondaryButton } from "../../components/base/Button";
import { Checkbox } from "../../components/base/Input";
import Space, { VerticalSpace } from "../../components/base/Space";
import type { IBudget } from "../../entities/Budget";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { formatDateMonth, startOfMonthOffset } from "../../utils/Date";
import useMessages, { type TMessages } from "../../utils/Messages";

import { PlusCircleIcon } from "@heroicons/react/24/outline";
import _ from "lodash";
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
	const { config, budget, navigation } = useMoneeeyStore();
	const onNewBudget = () => navigation.updateEditingBudget(budget.factory());
	return (
		<Space>
			<LinkButton
				testId="addNewBudget"
				onClick={onNewBudget}
				className="text-sm"
			>
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
			<MonthDateSelector
				date={startingDate}
				setDate={setStartingDate}
				Messages={Messages}
			/>
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
