import { observer } from "mobx-react";
import { type Dispatch, type SetStateAction, useState } from "react";

import { LinkButton, SecondaryButton } from "../../components/base/Button";
import { Checkbox, InputNumber } from "../../components/base/Input";
import Space, { VerticalSpace } from "../../components/base/Space";
import type { IBudget } from "../../entities/Budget";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { formatDateMonth, startOfMonthOffset } from "../../utils/Date";
import useMessages, { type TMessages } from "../../utils/Messages";

import { CalendarDaysIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import _ from "lodash";
import { HeaderContent } from "../../components/AppMenu";
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
	<Space>
		<SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -1))}>
			{Messages.budget.prev}
		</SecondaryButton>
		<span>{formatDateMonth(date)}</span>
		<SecondaryButton onClick={() => setDate(startOfMonthOffset(date, +1))}>
			{Messages.budget.next}
		</SecondaryButton>
	</Space>
);

const Budget = observer(() => {
	const Messages = useMessages();
	const { config, budget } = useMoneeeyStore();
	const [startingDate, setStartingDate] = useState(() =>
		startOfMonthOffset(new Date(), 0),
	);
	const [editing, setEditing] = useState<IBudget | undefined>(undefined);

	const viewMonths = config.main?.view_months || 3;
	const viewArchived = config.main?.view_archived === true;
	const onNewBudget = () => setEditing(budget.factory());

	return (
		<>
			<HeaderContent>
				<Space>
					<div className="flex flex-row">
						{_.range(6).map((index) => (
							<CalendarDaysIcon
								onClick={() => {
									config.merge({
										...config.main,
										view_months: index + 1,
									});
								}}
								style={{
									color:
										index + 1 <= config.main.view_months
											? "lightgreen"
											: "gray",
									width: "1.2em",
									height: "1.2em",
									marginRight: "0.5em",
								}}
							/>
						))}
					</div>
					<Checkbox
						testId="checkboxViewArchived"
						value={viewArchived}
						onChange={(view_archived) =>
							config.merge({ ...config.main, view_archived })
						}
						placeholder={Messages.budget.show_archived}
					>
						{Messages.budget.show_archived}
					</Checkbox>
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
			</HeaderContent>
			<VerticalSpace>
				<MonthDateSelector
					date={startingDate}
					setDate={setStartingDate}
					Messages={Messages}
				/>

				<BudgetPeriods
					startingDate={startingDate}
					setEditing={setEditing}
					viewArchived={viewArchived}
					viewMonths={viewMonths}
				/>
				{editing && <BudgetEditor editing={editing} setEditing={setEditing} />}
			</VerticalSpace>
		</>
	);
});

export default Budget;
