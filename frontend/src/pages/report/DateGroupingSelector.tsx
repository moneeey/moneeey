import _ from "lodash";

import Select from "../../components/base/Select";
import useMessages from "../../utils/Messages";

import { type PeriodGroup, PeriodGroups } from "./ReportUtils";

const DateGroupingSelector = ({
	setPeriod,
	period,
}: {
	setPeriod: (newPeriod: PeriodGroup) => void;
	period: PeriodGroup;
}) => {
	const Messages = useMessages();

	return (
		<Select
			testId="dateGroupingSelector"
			placeholder={period.label}
			options={_(_.values(PeriodGroups(Messages)))
				.sortBy("order")
				.map((p) => ({ label: p.label, value: p.label }))
				.value()}
			value={period.label}
			onChange={(selectedLabel: string) => {
				const newPeriod = _.values(PeriodGroups(Messages)).find(
					(p) => p.label === selectedLabel,
				);
				if (newPeriod) {
					setPeriod(newPeriod);
				}
			}}
		/>
	);
};

export default DateGroupingSelector;
