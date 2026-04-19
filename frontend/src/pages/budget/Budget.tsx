import { observer } from "mobx-react";
import { type Dispatch, type SetStateAction, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import { Checkbox } from "../../components/base/Input";
import Space, { VerticalSpace } from "../../components/base/Space";
import type { IBudget } from "../../entities/Budget";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { formatDateMonth, startOfMonthOffset } from "../../utils/Date";
import useMessages, { type TMessages } from "../../utils/Messages";

import BudgetEditor from "./BudgetEditor";
import BudgetPeriods from "./BudgetPeriod";

type MonthDateSelectorProps = {
	setDate: Dispatch<SetStateAction<Date>>;
	date: Date;
	Messages: TMessages;
};

export const MONTH_OFFSETS = [-2, -1, 0, 1, 2];

const MonthDateSelector = ({
	setDate,
	date,
	Messages,
}: MonthDateSelectorProps) => (
	<Space className="justify-center flex-wrap">
		<SecondaryButton
			onClick={() => setDate(startOfMonthOffset(date, -1))}
			title={Messages.budget.prev}
		>
			<ChevronLeftIcon className="h-4 w-4" />
		</SecondaryButton>
		{MONTH_OFFSETS.map((offset) => {
			const d = startOfMonthOffset(date, offset);
			const isCurrent = offset === 0;
			const Btn = isCurrent ? PrimaryButton : SecondaryButton;
			return (
				<Btn
					key={offset}
					onClick={() => setDate(d)}
					className={isCurrent ? "font-semibold" : "opacity-70"}
				>
					{formatDateMonth(d)}
				</Btn>
			);
		})}
		<SecondaryButton
			onClick={() => setDate(startOfMonthOffset(date, +1))}
			title={Messages.budget.next}
		>
			<ChevronRightIcon className="h-4 w-4" />
		</SecondaryButton>
	</Space>
);

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
		<VerticalSpace className="flex-1 min-h-0 overflow-auto pr-2 pb-4">
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
