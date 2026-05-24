import { observer } from "mobx-react";
import { useMemo } from "react";

import { AccountKind } from "../../entities/Account";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import { baseAccountBalanceReport } from "./AccountBalanceReport";
import { BaseReport } from "./BaseReport";
import ReportBarChart from "./charts/ReportBarChart";

const payeeBalanceReport = (moneeeyStore: MoneeeyStore) =>
	baseAccountBalanceReport(
		moneeeyStore,
		true,
		(account) => account.kind === AccountKind.PAYEE,
	);

const PayeeBalanceReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;
	const processFn = useMemo(
		() => payeeBalanceReport(moneeeyStore),
		[moneeeyStore],
	);

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={processFn}
			title={Messages.reports.payee_balance}
			chartFn={(data, period) => {
				const positivePoints = new Map<string, Record<string, number>>();
				for (const [date, record] of data.points.entries()) {
					const absRecord: Record<string, number> = {};
					for (const k of Object.keys(record)) {
						absRecord[k] = Math.abs(record[k]);
					}
					positivePoints.set(date, absRecord);
				}
				const positiveData = { columns: data.columns, points: positivePoints };
				return (
					<ReportBarChart data={positiveData} xFormatter={period.formatter} />
				);
			}}
		/>
	);
});

export default PayeeBalanceReport;
